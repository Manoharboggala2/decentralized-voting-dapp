// 1. SMART CONTRACT CONFIGURATION
const contractAddress = "0x7c4992A197411067886Ef6f0ec24E8d4035E88f8";
const SEPOLIA_CHAIN_ID = "0xaa36a7";

const contractABI = [
  "function candidates(uint256) view returns (string name, uint256 voteCount)",
  "function getCandidatesCount() view returns (uint256)",
  "function hasVoted(address) view returns (bool)",
  "function vote(uint256 candidateIndex)"
];

let provider, signer, contract;
document.getElementById("contractLink").href = `https://etherscan.io{contractAddress}`;

// 2. INTERACTIVE 3D CARD TILT EFFECT
const card = document.getElementById("tiltCard");
document.addEventListener("mousemove", (e) => {
  if (window.innerWidth < 768) return;
  const xAxis = (window.innerWidth / 2 - e.pageX) / 45;
  const yAxis = (window.innerHeight / 2 - e.pageY) / 45;
  card.style.transform = `rotateY(${-xAxis}deg) rotateX(${yAxis}deg)`;
});

document.addEventListener("mouseleave", () => {
  card.style.transform = `rotateY(0deg) rotateX(0deg)`;
});

// 3. CONNECT METAMASK & VERIFY SEPOLIA NETWORK
async function connectWallet() {
  if (!window.ethereum) {
    showStatus("MetaMask not detected! Please install the MetaMask browser extension.", "error");
    return;
  }

  try {
    const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
    if (currentChainId !== SEPOLIA_CHAIN_ID) {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }]
      });
    }

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    const fullAddress = await signer.getAddress();

    document.getElementById("walletAddress").innerText = `${fullAddress.slice(0, 6)}...${fullAddress.slice(-4)}`;
    document.getElementById("connectBtn").style.display = "none";
    document.getElementById("walletBar").style.display = "flex";

    contract = new ethers.Contract(contractAddress, contractABI, signer);
    await loadCandidates(fullAddress);
  } catch (err) {
    showStatus("Connection error: " + (err.reason || err.message), "error");
  }
}

// 4. LOAD CANDIDATES & ANIMATE VOTE PERCENTAGE BARS
async function loadCandidates(userAddress) {
  const listDiv = document.getElementById("candidatesList");
  listDiv.innerHTML = `<p style="color:#94a3b8; text-align:center; padding:15px;">Syncing live state from Ethereum...</p>`;

  const count = Number(await contract.getCandidatesCount());
  const alreadyVoted = await contract.hasVoted(userAddress);

  const candidateData = [];
  let totalVotes = 0;

  for (let i = 0; i < count; i++) {
    const c = await contract.candidates(i);
    const votes = Number(c.voteCount);
    totalVotes += votes;
    candidateData.push({ index: i, name: c.name, votes: votes });
  }

  listDiv.innerHTML = "";

  candidateData.forEach((item, idx) => {
    const percentage = totalVotes === 0 ? 0 : Math.round((item.votes / totalVotes) * 100);
    const row = document.createElement("div");
    row.className = "candidate-card";
    row.style.animationDelay = `${idx * 0.1}s`;

    row.innerHTML = `
      <div class="candidate-top">
        <span class="candidate-name">${item.name}</span>
        <div>
          <span class="vote-stats">${item.votes} ${item.votes === 1 ? "vote" : "votes"} (${percentage}%)</span>
          <button class="vote-btn" onclick="castVote(${item.index})" ${alreadyVoted ? "disabled" : ""}>
            ${alreadyVoted ? "Voted ✓" : "Vote"}
          </button>
        </div>
      </div>
      <div class="progress-track">
        <div class="progress-fill" id="bar-${item.index}" style="width: 0%"></div>
      </div>
    `;
    listDiv.appendChild(row);

    setTimeout(() => {
      document.getElementById(`bar-${item.index}`).style.width = `${percentage}%`;
    }, 120);
  });
}

// 5. SUBMIT VOTE TRANSACTION TO ETHEREUM SEPOLIA
async function castVote(index) {
  try {
    showStatus("Waiting for signature... Please confirm the transaction in MetaMask.", "info");
    const tx = await contract.vote(index);

    showStatus(
      `Transaction broadcast! Waiting for block confirmation... <br><a href="https://etherscan.io{tx.hash}" target="_blank">View pending transaction on Etherscan ↗</a>`,
      "info"
    );

    await tx.wait();

    showStatus(
      `Vote permanently recorded on Ethereum! <br><a href="https://etherscan.io{tx.hash}" target="_blank">Verify cryptographic receipt on Etherscan ↗</a>`,
      "success"
    );

    const userAddress = await signer.getAddress();
    await loadCandidates(userAddress);
  } catch (err) {
    showStatus("Transaction canceled or failed: " + (err.reason || err.message), "error");
  }
}

function showStatus(htmlMessage, type) {
  const box = document.getElementById("statusBox");
  box.style.display = "block";
  box.innerHTML = htmlMessage;

  if (type === "error") {
    box.style.background = "rgba(239, 68, 68, 0.12)";
    box.style.border = "1px solid rgba(239, 68, 68, 0.4)";
    box.style.color = "#fca5a5";
  } else if (type === "success") {
    box.style.background = "rgba(16, 185, 129, 0.12)";
    box.style.border = "1px solid rgba(16, 185, 129, 0.4)";
    box.style.color = "#6ee7b7";
  } else {
    box.style.background = "rgba(56, 189, 248, 0.12)";
    box.style.border = "1px solid rgba(56, 189, 248, 0.35)";
    box.style.color = "#bae6fd";
  }
}
