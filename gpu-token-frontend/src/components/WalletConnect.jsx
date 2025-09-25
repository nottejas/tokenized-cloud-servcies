import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { connectWallet, initializeWithSigner } from "../utils/ethereum";

function getInjectedProviders() {
  const providers = [];

  const eth = typeof window !== "undefined" ? window.ethereum : undefined;
  const solana =
    typeof window !== "undefined"
      ? window.phantom?.solana || window.solana
      : undefined;

  const injected = Array.isArray(eth?.providers)
    ? eth.providers
    : [eth].filter(Boolean);

  for (const prov of injected) {
    if (!prov) continue;
    const isMetaMask = Boolean(prov.isMetaMask);
    const isPhantomEvm = Boolean(prov.isPhantom && prov.request);
    const name = isMetaMask
      ? "MetaMask"
      : isPhantomEvm
      ? "Phantom (EVM)"
      : prov?.providerMapName || prov?.constructor?.name || "Injected EVM";

    providers.push({
      id: isMetaMask
        ? "metamask"
        : isPhantomEvm
        ? "phantom-evm"
        : "injected-evm",
      name,
      kind: "evm",
      provider: prov,
    });
  }

  if (solana && solana.isPhantom) {
    providers.push({
      id: "phantom-sol",
      name: "Phantom (Solana)",
      kind: "solana",
      provider: solana,
    });
  }

  return providers;
}

export default function WalletConnect({ onConnect }) {
  const [showModal, setShowModal] = useState(false);
  const [detected, setDetected] = useState([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");

  useEffect(() => {
    setDetected(getInjectedProviders());
  }, []);

  const evmProviders = useMemo(
    () => detected.filter((p) => p.kind === "evm"),
    [detected]
  );
  const solProvider = useMemo(
    () => detected.find((p) => p.kind === "solana"),
    [detected]
  );

  async function connectWith(entry) {
    if (!entry) return;
    setConnecting(true);
    setError("");
    try {
      if (entry.kind === "solana") {
        await entry.provider.connect();
        const addr = entry.provider.publicKey?.toString?.() || "";
        setAccount(addr);
        setChainId("solana");
        onConnect?.({
          address: addr,
          network: "solana",
          provider: entry.provider,
          type: "solana",
        });
        setShowModal(false);
        return;
      }

      // EVM wallet (MetaMask, Phantom EVM, etc.)
      const provider = entry.provider;
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });
      const hexChainId = await provider.request({ method: "eth_chainId" });
      const addr = accounts?.[0] || "";
      setAccount(addr);
      const numericChainId = parseInt(hexChainId, 16).toString();
      setChainId(numericChainId);

      const browserProvider = new ethers.BrowserProvider(provider);
      const signer = await browserProvider.getSigner();
      window.__evm = { provider: browserProvider, signer };
      // Ensure ethereum.js has a contract initialized with this signer
      initializeWithSigner(signer);

      onConnect?.({
        address: addr,
        network: numericChainId,
        provider: browserProvider,
        signer,
        type: "evm",
      });
      setShowModal(false);

      // 🔄 Listen for account changes
      provider.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
          onConnect?.(null);
          setAccount("");
        } else {
          const newAddr = accounts[0];
          setAccount(newAddr);
          (async () => {
            try {
              const s = await browserProvider.getSigner();
              window.__evm = { provider: browserProvider, signer: s };
              initializeWithSigner(s);
              onConnect?.({
                address: newAddr,
                network: parseInt(await provider.request({ method: "eth_chainId" }), 16).toString(),
                provider: browserProvider,
                signer: s,
                type: "evm",
              });
            } catch (e) {
              console.error(e);
            }
          })();
        }
      });
    } catch (e) {
      setError(e?.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }

  function handleClick() {
    const evmCount = evmProviders.length;
    if (evmCount <= 1 && !solProvider) {
      if (evmCount === 1) return connectWith(evmProviders[0]);
      setError("No wallet detected. Install MetaMask or Phantom.");
      return;
    }
    setShowModal(true);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button onClick={handleClick} disabled={connecting}>
        {account
          ? account.slice(0, 6) + "…" + account.slice(-4)
          : connecting
          ? "Connecting…"
          : "Connect Wallet"}
      </button>
      {error && <span style={{ color: "crimson", fontSize: 12 }}>{error}</span>}

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 12,
              minWidth: 360,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Select a wallet</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {evmProviders.map((p) => (
                <button
                  key={p.id}
                  onClick={() => connectWith(p)}
                  disabled={connecting}
                >
                  {p.name}
                </button>
              ))}
              {solProvider && (
                <button
                  onClick={() => connectWith(solProvider)}
                  disabled={connecting}
                >
                  {solProvider.name}
                </button>
              )}
            </div>
            <div style={{ marginTop: 12, textAlign: "right" }}>
              <button onClick={() => setShowModal(false)} disabled={connecting}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
