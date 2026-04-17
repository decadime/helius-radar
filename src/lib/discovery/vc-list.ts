// Curated VC discovery list.
//
// `solanaRelevant` flags funds with material Solana exposure — runs default
// to that subset because scraping an Accel / Greylock / Pear portfolio yields
// ~5% Solana relevance at best. Flip all to true for a full sweep.

export type VcSource = {
  name: string;
  slug: string;
  homepage: string;
  /** Explicit portfolio URL if known; null = fall back to homepage. */
  portfolioUrl: string | null;
  solanaRelevant: boolean;
};

export const VC_LIST: VcSource[] = [
  // Crypto-native, heavy Solana exposure
  { name: "Multicoin Capital", slug: "multicoin", homepage: "https://multicoin.capital/", portfolioUrl: "https://multicoin.capital/portfolio/", solanaRelevant: true },
  { name: "Jump Crypto / Jump", slug: "jump", homepage: "https://jumpcrypto.com/", portfolioUrl: "https://jumpcrypto.com/partners/", solanaRelevant: true },
  { name: "Solana Ventures (via Foundation)", slug: "solana-ventures", homepage: "https://solana.com/", portfolioUrl: "https://solana.com/ecosystem", solanaRelevant: true },
  { name: "Dragonfly", slug: "dragonfly", homepage: "https://www.dragonfly.xyz/", portfolioUrl: "https://www.dragonfly.xyz/portfolio", solanaRelevant: true },
  { name: "Polychain Capital", slug: "polychain", homepage: "https://polychain.capital/", portfolioUrl: "https://polychain.capital/portfolio", solanaRelevant: true },
  { name: "Paradigm", slug: "paradigm", homepage: "https://www.paradigm.xyz/", portfolioUrl: "https://www.paradigm.xyz/portfolio", solanaRelevant: true },
  { name: "Electric Capital", slug: "electric", homepage: "https://www.electriccapital.com/", portfolioUrl: null, solanaRelevant: true },
  { name: "Framework Ventures", slug: "framework", homepage: "https://www.framework.ventures/", portfolioUrl: "https://www.framework.ventures/portfolio", solanaRelevant: true },
  { name: "Variant", slug: "variant", homepage: "https://variant.fund/", portfolioUrl: "https://variant.fund/portfolio/", solanaRelevant: true },
  { name: "a16z crypto", slug: "a16z-crypto", homepage: "https://a16zcrypto.com/", portfolioUrl: "https://a16zcrypto.com/portfolio/", solanaRelevant: true },
  { name: "a16z Speedrun", slug: "a16z-speedrun", homepage: "https://speedrun.a16z.com/", portfolioUrl: null, solanaRelevant: true },
  { name: "Hack VC", slug: "hack", homepage: "https://www.hack.vc/", portfolioUrl: null, solanaRelevant: true },
  { name: "1confirmation", slug: "1confirmation", homepage: "https://www.1confirmation.com/", portfolioUrl: null, solanaRelevant: true },
  { name: "Blockchain Capital", slug: "blockchain-capital", homepage: "https://www.blockchaincapital.com/", portfolioUrl: "https://www.blockchaincapital.com/portfolio", solanaRelevant: true },
  { name: "Coinbase Ventures", slug: "coinbase-ventures", homepage: "https://www.coinbase.com/ventures", portfolioUrl: null, solanaRelevant: true },
  { name: "Pantera Capital", slug: "pantera", homepage: "https://panteracapital.com/", portfolioUrl: "https://panteracapital.com/portfolio/", solanaRelevant: true },
  { name: "Spartan Group", slug: "spartan", homepage: "https://www.spartangroup.io/", portfolioUrl: null, solanaRelevant: true },
  { name: "Nascent", slug: "nascent", homepage: "https://www.nascent.xyz/", portfolioUrl: "https://www.nascent.xyz/portfolio", solanaRelevant: true },
  { name: "Volt Capital", slug: "volt", homepage: "https://volt.capital/", portfolioUrl: null, solanaRelevant: true },
  { name: "Robot Ventures", slug: "robot", homepage: "https://robvc.com/", portfolioUrl: null, solanaRelevant: true },
  { name: "Symbolic Capital", slug: "symbolic", homepage: "https://www.symbolic.capital/", portfolioUrl: null, solanaRelevant: true },
  { name: "Lattice", slug: "lattice", homepage: "https://www.lattice.fund/", portfolioUrl: null, solanaRelevant: true },
  { name: "Fabric Ventures", slug: "fabric", homepage: "https://www.fabric.vc/", portfolioUrl: "https://www.fabric.vc/portfolio", solanaRelevant: true },
  { name: "Greenfield", slug: "greenfield", homepage: "https://greenfield.xyz/", portfolioUrl: null, solanaRelevant: true },
  { name: "Ethereal Ventures", slug: "ethereal", homepage: "https://www.etherealventures.com/", portfolioUrl: null, solanaRelevant: true },
  { name: "Anagram", slug: "anagram", homepage: "https://www.anagram.xyz/", portfolioUrl: null, solanaRelevant: true },
  { name: "6th Man Ventures", slug: "6mv", homepage: "https://6thman.ventures/", portfolioUrl: null, solanaRelevant: true },
  { name: "Alliance DAO", slug: "alliance", homepage: "https://alliance.xyz/", portfolioUrl: "https://alliance.xyz/companies", solanaRelevant: true },
  { name: "Archetype", slug: "archetype", homepage: "https://www.archetype.fund/", portfolioUrl: null, solanaRelevant: true },
  { name: "Hashed", slug: "hashed", homepage: "https://www.hashed.com/", portfolioUrl: "https://www.hashed.com/portfolio", solanaRelevant: true },
  { name: "Lemniscap", slug: "lemniscap", homepage: "https://lemniscap.com/", portfolioUrl: null, solanaRelevant: true },
  { name: "Caladan", slug: "caladan", homepage: "https://caladan.xyz/", portfolioUrl: null, solanaRelevant: true },
  { name: "Folius Ventures", slug: "folius", homepage: "https://www.folius.ventures/", portfolioUrl: null, solanaRelevant: true },
  { name: "Wintermute Ventures", slug: "wintermute", homepage: "https://www.wintermute.com/ventures", portfolioUrl: null, solanaRelevant: true },
  { name: "Selini Capital", slug: "selini", homepage: "https://www.selinicapital.com/", portfolioUrl: null, solanaRelevant: true },
  { name: "NGC Ventures", slug: "ngc", homepage: "https://ngc.fund/", portfolioUrl: null, solanaRelevant: true },
  { name: "Manifold Trading", slug: "manifold", homepage: "https://www.manifoldtrading.vc/", portfolioUrl: null, solanaRelevant: true },
  { name: "Mirana Ventures", slug: "mirana", homepage: "https://www.mirana.xyz/", portfolioUrl: null, solanaRelevant: true },
  { name: "Cyber Fund", slug: "cyber", homepage: "https://cyber.fund/", portfolioUrl: null, solanaRelevant: true },
  { name: "Zee Prime", slug: "zeeprime", homepage: "https://zeeprime.xyz/", portfolioUrl: null, solanaRelevant: true },
  { name: "Big Brain Holdings", slug: "bigbrain", homepage: "https://www.bigbrain.holdings/", portfolioUrl: null, solanaRelevant: true },
  { name: "MH Ventures", slug: "mhv", homepage: "https://www.mhventures.io/", portfolioUrl: null, solanaRelevant: true },
  { name: "Moonrock Capital", slug: "moonrock", homepage: "https://www.moonrockcapital.io/", portfolioUrl: null, solanaRelevant: true },
  { name: "Native Crypto", slug: "native", homepage: "https://nativecrypto.xyz/cc/", portfolioUrl: null, solanaRelevant: true },
  { name: "No Limit Holdings", slug: "nolimit", homepage: "https://nolimitholdings.xyz/", portfolioUrl: null, solanaRelevant: true },
  { name: "Orange DAO", slug: "orangedao", homepage: "https://www.orangedao.xyz/", portfolioUrl: null, solanaRelevant: true },
  { name: "Fenbushi", slug: "fenbushi", homepage: "https://fenbushi.vc/", portfolioUrl: null, solanaRelevant: true },
  { name: "Slow Ventures", slug: "slow", homepage: "https://slow.co/", portfolioUrl: null, solanaRelevant: true },
  { name: "Antler", slug: "antler", homepage: "https://www.antler.co/", portfolioUrl: null, solanaRelevant: true },
  { name: "Stake Capital", slug: "stake-capital", homepage: "https://www.stake.capital/", portfolioUrl: null, solanaRelevant: true },
  { name: "USV", slug: "usv", homepage: "https://www.usv.com/", portfolioUrl: "https://www.usv.com/companies", solanaRelevant: true },

  // General tech funds — crypto is a minority of their portfolio. Off by
  // default because the signal-to-noise is poor; enable explicitly if needed.
  { name: "Accel", slug: "accel", homepage: "https://www.accel.com/", portfolioUrl: null, solanaRelevant: false },
  { name: "Founders Fund", slug: "founders-fund", homepage: "https://foundersfund.com/", portfolioUrl: null, solanaRelevant: false },
  { name: "Greylock", slug: "greylock", homepage: "https://greylock.com/", portfolioUrl: null, solanaRelevant: false },
  { name: "NFX", slug: "nfx", homepage: "https://www.nfx.com/", portfolioUrl: null, solanaRelevant: false },
  { name: "Pear VC", slug: "pear", homepage: "https://pear.vc/", portfolioUrl: null, solanaRelevant: false },
  { name: "South Park Commons", slug: "spc", homepage: "https://www.southparkcommons.com/founder-fellowship", portfolioUrl: null, solanaRelevant: false },
  { name: "Boost VC", slug: "boost", homepage: "https://www.boost.vc/", portfolioUrl: null, solanaRelevant: false },
  { name: "White Star Capital", slug: "whitestar", homepage: "https://whitestarcapital.com/", portfolioUrl: null, solanaRelevant: false },
  { name: "TCG", slug: "tcg", homepage: "https://tcg.co/", portfolioUrl: null, solanaRelevant: false },
  { name: "Morph VC", slug: "morph", homepage: "https://www.morph.vc/", portfolioUrl: null, solanaRelevant: false },
];

export function getVcSources(opts?: { all?: boolean }): VcSource[] {
  if (opts?.all) return VC_LIST;
  return VC_LIST.filter((v) => v.solanaRelevant);
}
