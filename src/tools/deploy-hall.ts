// The development-only deploy page (deploy-hall.html). It deploys the compiled Hall from the browser wallet.
import {
  createPublicClient, createWalletClient, custom, defineChain, encodeAbiParameters, formatUnits, http, isAddress,
  type Abi, type Address, type Hex,
} from "viem";
import { injectedProvider, type Eip1193 } from "@/chain/wallet";

const NETWORKS = {
  mainnet: defineChain({
    id: 5042, name: "Arc", nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
    rpcUrls: { default: { http: ["https://rpc.mainnet.arc.io"] } },
    blockExplorers: { default: { name: "Arc Explorer", url: "https://explorer.arc.io" } },
  }),
  testnet: defineChain({
    id: 5042002, name: "Arc Testnet", nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
    rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } },
    blockExplorers: { default: { name: "Arc Testnet Explorer", url: "https://explorer.testnet.arc.io" } },
  }),
} as const;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const net = $<HTMLSelectElement>("net");
const signerInput = $<HTMLInputElement>("signer");
const deployButton = $<HTMLButtonElement>("deploy");
const walletLine = $("wallet");
const out = $("out");

let account: Address | null = null;
let provider: Eip1193 | null = null;
let connectedChain: number | null = null;

const chain = () => NETWORKS[net.value as keyof typeof NETWORKS];
const say = (text: string, cls = "") => { out.className = cls; out.textContent = text; };

function refreshButton() {
  deployButton.disabled = !(account && connectedChain === chain().id && isAddress(signerInput.value.trim()));
}

async function switchTo(p: Eip1193) {
  const c = chain();
  const chainId = `0x${c.id.toString(16)}`;
  try {
    await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code !== 4902 && !/unrecognized|not been added/i.test((error as Error).message ?? "")) throw error;
    await p.request({
      method: "wallet_addEthereumChain",
      params: [{ chainId, chainName: c.name, nativeCurrency: c.nativeCurrency, rpcUrls: c.rpcUrls.default.http, blockExplorerUrls: [c.blockExplorers.default.url] }],
    });
  }
}

$("connect").addEventListener("click", async () => {
  try {
    provider = injectedProvider();
    if (!provider) throw new Error("No browser wallet found.");
    const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
    account = accounts[0] as Address;
    await switchTo(provider);
    connectedChain = chain().id;
    const balance = await createPublicClient({ chain: chain(), transport: http() }).getBalance({ address: account });
    walletLine.textContent = `${account} on ${chain().name}, ${formatUnits(balance, 18)} USDC for gas`;
    walletLine.className = "mono ok";
  } catch (e) {
    walletLine.textContent = e instanceof Error ? e.message.split("\n")[0] : String(e);
    walletLine.className = "mono err";
  }
  refreshButton();
});

net.addEventListener("change", () => { connectedChain = null; walletLine.textContent = "Network changed: connect again."; refreshButton(); });
signerInput.addEventListener("input", refreshButton);

deployButton.addEventListener("click", async () => {
  if (!account || !provider) return;
  const signer = signerInput.value.trim() as Address;
  deployButton.disabled = true;
  try {
    say("Loading the compiled contract…");
    const artifact = await (await fetch("/contracts/out/EmberdeepHall.json")).json() as { abi: Abi; bytecode: Hex; compiler: string };
    const c = chain();
    const wallet = createWalletClient({ account, chain: c, transport: custom(provider) });
    say("Confirm the deployment in your wallet…");
    const hash = await wallet.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args: [signer] });
    say(`Sent: ${hash}\nWaiting for Arc…`);
    const receipt = await createPublicClient({ chain: c, transport: http() }).waitForTransactionReceipt({ hash, timeout: 120_000 });
    if (receipt.status !== "success" || !receipt.contractAddress) throw new Error(`The deployment failed (${hash}).`);
    const args = encodeAbiParameters([{ type: "address" }], [signer]).slice(2);
    say([
      `Deployed on ${c.name}.`,
      ``,
      `Hall address:   ${receipt.contractAddress}`,
      `Deployed at block: ${receipt.blockNumber}`,
      `Owner (you):    ${account}`,
      `Signer:         ${signer}`,
      `Explorer:       ${c.blockExplorers.default.url}/address/${receipt.contractAddress}`,
      ``,
      `Next:`,
      `1. Give the Hall address and the block number to whoever wires them into src/chain/arc-config.ts.`,
      `2. On the server, set HALL_ADDRESS=${receipt.contractAddress} (see deploy/README.md).`,
      `3. Verify the source on the explorer: "Solidity (Standard JSON input)", compiler ${artifact.compiler.split(".Emscripten")[0]},`,
      `   file contracts/out/EmberdeepHall.standard-input.json, constructor arguments:`,
      `   ${args}`,
    ].join("\n"), "ok");
  } catch (e) {
    say(e instanceof Error ? (e as { shortMessage?: string }).shortMessage ?? e.message.split("\n")[0] : String(e), "err");
  }
  refreshButton();
});
