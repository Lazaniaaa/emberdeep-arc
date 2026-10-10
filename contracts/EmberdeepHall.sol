// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {EIP712} from "solady/utils/EIP712.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";

/// @title Emberdeep Hall of Descents
/// @notice The record book of Emberdeep descents on Arc. A record is accepted only with a signature from the game's
///         attestation key, and the game signs a descent only after replaying every move of it on its server.
/// @dev    The Hall holds no funds. No function is payable, there is no receive or fallback, and it makes no external
///         calls. The worst a compromised owner or signer key can do is write false records or pause new ones; past
///         records are events and cannot be changed. Built on Solady's EIP712 and ECDSA, as Onchain Heroes are, with
///         its own two-step ownership because Solady's Ownable functions are payable and this contract must never
///         take in USDC (Arc's gas token) by accident.
contract EmberdeepHall is EIP712 {
    /// @notice One finished descent, as the game's server signed it.
    struct Descent {
        address player;
        /// Unique per descent: keccak256 of the player, the dungeon seed and the moves. A runId is recorded once.
        bytes32 runId;
        /// Deepest floor reached, 1 to MAX_DEPTH.
        uint8 depth;
        uint32 gold;
        uint16 kills;
        /// The delver came home alive. Only such descents rank; the gold of the others was lost in the dark.
        bool home;
        bool bossSlain;
        /// Unix time after which the signature is no longer accepted.
        uint64 deadline;
    }

    bytes32 public constant DESCENT_TYPEHASH = keccak256(
        "Descent(address player,bytes32 runId,uint8 depth,uint32 gold,uint16 kills,bool home,bool bossSlain,uint64 deadline)"
    );

    /// @notice The boss floor, the deepest a descent goes.
    uint8 public constant MAX_DEPTH = 7;

    /// @notice A player's standing: their best descent that came home, and how many descents they recorded.
    /// @dev    One storage slot. "Best" is deeper first, then more gold; a tie keeps the earlier descent. A descent
    ///         that did not come home is counted in `runs` but never becomes the best, because its gold was lost.
    struct Standing {
        uint8 depth;
        uint32 gold;
        uint16 kills;
        bool bossSlain;
        /// The best descent is set (the player has come home at least once).
        bool ranked;
        uint32 runs;
    }

    address public owner;
    address public pendingOwner;
    /// @notice The game's attestation key. Never zero.
    address public signer;
    bool public paused;
    uint256 public totalRecords;
    /// @notice Whether a descent has been recorded already.
    mapping(bytes32 runId => bool) public recorded;
    /// @notice Each player's standing. The leaderboard is read from here (and `players`) with plain calls, so it
    ///         needs no log history, which public RPCs keep only for a short while.
    mapping(address player => Standing) public standingOf;
    /// @notice Every player who has recorded a descent, in the order they first did.
    address[] public players;

    event DescentRecorded(
        address indexed player,
        bytes32 indexed runId,
        uint8 depth,
        uint32 gold,
        uint16 kills,
        bool home,
        bool bossSlain
    );
    event SignerChanged(address indexed previousSigner, address indexed newSigner);
    event PausedSet(bool paused);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error NotPendingOwner();
    error ZeroAddress();
    error IsPaused();
    error Expired();
    error BadDepth();
    error AlreadyRecorded();
    error BadSignature();

    constructor(address initialSigner) {
        if (initialSigner == address(0)) revert ZeroAddress();
        owner = msg.sender;
        signer = initialSigner;
        emit OwnershipTransferred(address(0), msg.sender);
        emit SignerChanged(address(0), initialSigner);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ── records ────────────────────────────────────────────────────────────────────────────────────────

    /// @notice Writes a signed descent into the Hall. Anyone may submit it: the player's own wallet, or the game's
    ///         server paying the gas for a player who holds no USDC. The record always goes to `d.player`, which the
    ///         signature covers, so a signature seen in the mempool can only be submitted for that same player, once.
    function record(Descent calldata d, bytes calldata signature) external {
        if (paused) revert IsPaused();
        if (block.timestamp > d.deadline) revert Expired();
        if (d.depth == 0 || d.depth > MAX_DEPTH) revert BadDepth();
        if (recorded[d.runId]) revert AlreadyRecorded();

        // tryRecover returns zero for a malformed signature; the signer is never zero, so that fails below too.
        address recovered = ECDSA.tryRecoverCalldata(_hashTypedData(_structHash(d)), signature);
        if (recovered == address(0) || recovered != signer) revert BadSignature();

        recorded[d.runId] = true;
        Standing memory s = standingOf[d.player];
        if (s.runs == 0) players.push(d.player);
        unchecked {
            ++totalRecords;
            ++s.runs;
        }
        if (d.home && (!s.ranked || d.depth > s.depth || (d.depth == s.depth && d.gold > s.gold))) {
            (s.depth, s.gold, s.kills, s.bossSlain, s.ranked) = (d.depth, d.gold, d.kills, d.bossSlain, true);
        }
        standingOf[d.player] = s;
        emit DescentRecorded(d.player, d.runId, d.depth, d.gold, d.kills, d.home, d.bossSlain);
    }

    /// @notice How many players have recorded a descent.
    function playerCount() external view returns (uint256) {
        return players.length;
    }

    /// @notice Up to `count` players from `start` (in the order they joined) with their standings, for the leaderboard.
    function standings(uint256 start, uint256 count)
        external
        view
        returns (address[] memory who, Standing[] memory what)
    {
        uint256 end = players.length;
        if (start > end) start = end;
        if (count < end - start) end = start + count;
        who = new address[](end - start);
        what = new Standing[](end - start);
        for (uint256 i = start; i < end; ++i) {
            who[i - start] = players[i];
            what[i - start] = standingOf[players[i]];
        }
    }

    /// @notice The EIP-712 digest the signer signs for a descent, for off-chain checks.
    function digest(Descent calldata d) external view returns (bytes32) {
        return _hashTypedData(_structHash(d));
    }

    function _structHash(Descent calldata d) private pure returns (bytes32) {
        return keccak256(
            abi.encode(
                DESCENT_TYPEHASH, d.player, d.runId, d.depth, d.gold, d.kills, d.home, d.bossSlain, d.deadline
            )
        );
    }

    function _domainNameAndVersion() internal pure override returns (string memory name, string memory version) {
        name = "Emberdeep Hall";
        version = "1";
    }

    // ── administration ─────────────────────────────────────────────────────────────────────────────────

    /// @notice Replaces the attestation key, for example when the server's key is rotated.
    function setSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        emit SignerChanged(signer, newSigner);
        signer = newSigner;
    }

    /// @notice Stops (or resumes) new records. Records already written are untouched.
    function setPaused(bool value) external onlyOwner {
        paused = value;
        emit PausedSet(value);
    }

    /// @notice Starts handing the Hall to `newOwner`, who must accept. Passing zero cancels a pending handover.
    function transferOwnership(address newOwner) external onlyOwner {
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }
}
