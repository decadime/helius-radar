import { describe, expect, it } from "vitest";
import { RpcProvider } from "@prisma/client";
import {
  detectProviderInBundle,
  displacementScore,
  isCompetitorProvider,
  providerDisplay,
} from "./rpc-providers";

describe("detectProviderInBundle", () => {
  it.each([
    ['const url="https://mainnet.helius-rpc.com/?api-key=abc"', RpcProvider.HELIUS],
    ["fetch('https://api.helius.xyz/v0/addresses/...')", RpcProvider.HELIUS],
    ['rpcUrl:"https://solana-mainnet.g.alchemy.com/v2/KEY"', RpcProvider.ALCHEMY],
    ['"wss://solana-mainnet.quiknode.pro/abc123/"', RpcProvider.QUICKNODE],
    ['endpoint="https://solana-mainnet.api.syndica.io/key"', RpcProvider.SYNDICA],
    ['url:"https://some-slug.rpcpool.com"', RpcProvider.TRITON],
    ["'https://rpc.shyft.to?key=xyz'", RpcProvider.SHYFT],
    ['"https://rpc.ankr.com/solana"', RpcProvider.ANKR],
    ['new Connection("https://node.p2pify.com/abc")', RpcProvider.CHAINSTACK],
    ['"https://api.mainnet-beta.solana.com"', RpcProvider.PUBLIC_SOLANA],
  ])("matches %s", (content, expected) => {
    expect(detectProviderInBundle(content)).toBe(expected);
  });

  it("returns null when no known provider is present", () => {
    expect(detectProviderInBundle("const x = 1; // no rpc here")).toBeNull();
  });

  it("competitor wins over a Helius mention (stale imports common during migrations)", () => {
    const bundle = `
      // legacy config
      const heliusRpc = "https://mainnet.helius-rpc.com/?api-key=OLD";
      // current
      const rpc = "https://solana-mainnet.g.alchemy.com/v2/NEW";
    `;
    expect(detectProviderInBundle(bundle)).toBe(RpcProvider.ALCHEMY);
  });

  it("returns HELIUS when only Helius patterns are present", () => {
    expect(
      detectProviderInBundle('const u = "https://mainnet.helius-rpc.com/?api-key=X"')
    ).toBe(RpcProvider.HELIUS);
  });
});

describe("isCompetitorProvider", () => {
  it("flags paid + public competitors", () => {
    expect(isCompetitorProvider(RpcProvider.ALCHEMY)).toBe(true);
    expect(isCompetitorProvider(RpcProvider.QUICKNODE)).toBe(true);
    expect(isCompetitorProvider(RpcProvider.PUBLIC_SOLANA)).toBe(true);
  });
  it("does not flag Helius, Proxied, Unknown", () => {
    expect(isCompetitorProvider(RpcProvider.HELIUS)).toBe(false);
    expect(isCompetitorProvider(RpcProvider.PROXIED)).toBe(false);
    expect(isCompetitorProvider(RpcProvider.UNKNOWN)).toBe(false);
    expect(isCompetitorProvider(null)).toBe(false);
  });
});

describe("displacementScore", () => {
  it.each([
    [RpcProvider.ALCHEMY, 1.0],
    [RpcProvider.QUICKNODE, 1.0],
    [RpcProvider.SYNDICA, 1.0],
    [RpcProvider.PUBLIC_SOLANA, 1.0],
    [RpcProvider.UNKNOWN, 0.3],
    [RpcProvider.PROXIED, 0.2],
    [RpcProvider.HELIUS, 0.0],
  ])("%s → %s", (provider, expected) => {
    expect(displacementScore(provider)).toBe(expected);
  });

  it("unscanned accounts get partial credit (0.3) so they are not heavily penalized", () => {
    expect(displacementScore(null)).toBe(0.3);
    expect(displacementScore(undefined)).toBe(0.3);
  });
});

describe("providerDisplay", () => {
  it("readable labels for UI", () => {
    expect(providerDisplay(RpcProvider.HELIUS)).toBe("Helius");
    expect(providerDisplay(RpcProvider.ALCHEMY)).toBe("Alchemy");
    expect(providerDisplay(RpcProvider.QUICKNODE)).toBe("QuickNode");
    expect(providerDisplay(RpcProvider.PUBLIC_SOLANA)).toBe("Public Solana endpoint");
    expect(providerDisplay(RpcProvider.PROXIED)).toBe("Proxied (unknown)");
    expect(providerDisplay(null)).toBe("Not scanned");
  });
});
