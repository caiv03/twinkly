const state = {
  activeView: "onboarding",
  hasVisual: false,
  selectedTone: "Sharp",
  selectedLength: "Medium",
  topic: "Turn a quiet customer win into a public proof post",
  audience: "founders and growth leads",
  onboarding: {
    step: 0,
    niche: "AI productivity",
    website: "https://example.com",
    bio: "I help busy founders turn scattered operating knowledge into simple systems their teams actually use.",
    photos: [],
    status: "idle",
    xSource: null,
    xError: null,
    results: null
  },
  xConnect: {
    open: false,
    username: "",
    status: "idle",
    profile: null,
    similar: [],
    analysis: null,
    recommendedPosts: [],
    ownTweets: [],
    query: "",
    errors: []
  },
  posts: [],
  queued: [
    { time: "Today 3:20 PM", title: "3-line lesson post", status: "Ready" },
    { time: "Tomorrow 9:10 AM", title: "Founder POV remix", status: "Draft" }
  ],
  library: {
    status: "idle",
    niche: "",
    source: "",
    updatedAt: "",
    nextUpdateAt: "",
    posts: [],
    errors: []
  }
};

const nav = [
  ["onboarding", "Onboarding", "◇"],
  ["home", "Home", "⌂"],
  ["queue", "Queue", "↗"],
  ["library", "Library", "□"],
  ["writer", "AI Writer", "✎"],
  ["viral", "Viral Engine", "✦"],
  ["visual", "New visual", "+"],
  ["engage", "Engage", "◌"],
  ["analyze", "Analyze", "⌁"],
  ["settings", "Settings", "⚙"]
];

const prompts = {
  Sharp: [
    "Most teams bury their best proof in a customer call transcript.",
    "Here is the simple fix: turn one measurable win into one crisp public artifact.",
    "The format: problem, unexpected move, number, lesson, invitation.",
    "Proof beats polish when the reader can see the before and after."
  ],
  Warm: [
    "A small customer win can carry a much bigger story when you slow down enough to frame it.",
    "Start with the moment that changed: what was stuck, what shifted, and what became easier.",
    "Then give the reader one honest lesson they can reuse today.",
    "That is the kind of post people save because it feels lived, not manufactured."
  ],
  Analytical: [
    "Viral posts usually compress a useful pattern into a low-friction story.",
    "For this audience, the strongest angle is operational proof: what changed, by how much, and why.",
    "Use one metric, one decision, and one takeaway. Remove the rest.",
    "The goal is not volume. It is a post that makes the reader recognize their own bottleneck."
  ]
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function generatePosts() {
  const base = prompts[state.selectedTone];
  const topic = state.topic.trim() || "Explain a concrete growth lesson";
  const audience = state.audience.trim() || "operators";
  const lengths = {
    Short: base.slice(0, 2),
    Medium: base.slice(0, 3),
    Long: base
  };

  state.posts = [0, 1, 2].map((_, index) => ({
    id: crypto.randomUUID(),
    title: ["Clean Hook", "Story Arc", "Contrarian Angle"][index],
    score: [91, 87, 82][index],
    text: `${lengths[state.selectedLength].join("\n\n")}\n\nFor ${audience}: ${topic.toLowerCase()}.`,
    saves: [38, 31, 26][index],
    replies: [12, 9, 7][index]
  }));
}

function buildOnboardingAnalysis(liveSearch = { tweets: [], handles: [], source: null, errors: [] }) {
  const niche = state.onboarding.niche.trim() || "founder-led growth";
  const website = state.onboarding.website.trim() || "your website";
  const bio = state.onboarding.bio.trim();
  const photos = state.onboarding.photos;
  const photoNames = photos.length ? photos.map((photo) => photo.name) : ["clean founder portrait", "desk/process shot", "product screenshot"];
  const bioSignal = bio ? bio.split(/\s+/).slice(0, 10).join(" ") : "clear operator-led expertise";

  const handles = liveSearch.handles || [];
  const viralPosts = (liveSearch.tweets || []).map((tweet, index) => ({
    ...tweet,
    structure: inferStructure(tweet.text, index),
    likesLabel: formatCount(tweet.likes),
    repostsLabel: formatCount(tweet.reposts),
    repliesLabel: formatCount(tweet.replies),
    viewsLabel: tweet.views ? formatCount(tweet.views) : "n/a",
    rank: Math.max(72, Math.min(99, 99 - index * 4))
  }));

  const archetype = bio.toLowerCase().includes("founder") ? "Founder-Operator" : "Practical Specialist";
  const positioning = `${niche} for people who want usable systems, not vague inspiration.`;
  const tone = bio.length > 140 ? "Warm expert with analytical receipts" : "Sharp, direct, and useful";

  const drafts = [
    {
      title: "Hidden Workflow Hook",
      source: viralPosts[0]?.structure || "live search pattern -> original post",
      text: `Most ${niche} advice starts too late.\n\nBefore you optimize the shiny thing, look for the work your audience repeats every week.\n\nThat repeat is the opportunity:\n- name the bottleneck\n- remove one decision\n- make the next action obvious\n\nSmall systems beat big intentions.`,
      photo: photoNames[0],
      why: "A clear portrait or founder-facing image makes this feel like lived operating advice, not generic tips."
    },
    {
      title: "Numbered Pattern Post",
      source: viralPosts[1]?.structure || "ranked post structure -> checklist",
      text: `5 signs your ${niche} content is getting sharper:\n\n1. The hook names a real pain\n2. The example is specific\n3. The lesson is usable today\n4. The post has one idea\n5. The ending invites a next step\n\nClarity is a growth channel.`,
      photo: photoNames[1] || photoNames[0],
      why: "A workspace or process image pairs naturally with a checklist because it signals craft and execution."
    },
    {
      title: "Belief Contrast",
      source: viralPosts[2]?.structure || "contrast structure -> original belief",
      text: `${niche} does not go viral because it sounds smart.\n\nIt travels when the reader thinks: finally, someone explained the thing I keep running into.\n\nWrite for recognition first.\nOptimization second.`,
      photo: photoNames[0],
      why: "A human photo reinforces the reflective tone and gives the belief statement a credible narrator."
    },
    {
      title: "Before / After Proof",
      source: "problem -> shift -> measurable result",
      text: `Before: every ${niche} idea felt too broad to post.\n\nAfter: one audience, one painful moment, one practical takeaway.\n\nThat change turns a vague topic into a repeatable content engine.`,
      photo: photoNames[2] || photoNames[0],
      why: "A product screenshot or visual artifact makes the transformation easier to believe."
    },
    {
      title: "Authority Without Hype",
      source: "small confession -> lesson -> invitation",
      text: `I used to think stronger ${niche} posts needed bigger claims.\n\nThey usually need smaller claims with better proof.\n\nOne example.\nOne lesson.\nOne reason it matters.\n\nThat is enough to start a useful conversation.`,
      photo: photoNames[0],
      why: "A simple personal image softens the authority and makes the post feel candid."
    }
  ];

  return {
    searchedFor: niche,
    source: liveSearch.source,
    errors: liveSearch.errors || [],
    websiteSignal: website,
    imageSummaries: photoNames.map((name, index) => ({
      name,
      summary: index === 0 ? "human-led credibility asset" : index === 1 ? "behind-the-scenes process asset" : "proof or product context asset"
    })),
    handles,
    viralPosts,
    persona: {
      archetype,
      tone,
      positioning,
      bioSignal
    },
    drafts
  };
}

function inferStructure(text, index) {
  if (/^\d+|(\n\d+\.)/.test(text)) return "numbered lesson list -> practical takeaway";
  if (text.includes("?")) return "question hook -> answer -> reader payoff";
  if (text.includes(":")) return "sharp claim -> supporting detail -> concise close";
  return ["observation hook -> tactical list", "belief statement -> contrast", "specific pain -> simple lesson"][index % 3];
}

function formatCount(value = 0) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

function setView(view) {
  state.activeView = view;
  render();
  if (view === "library") loadLibrary(false);
}

function className(name, active) {
  return active ? `${name} is-active` : name;
}

function shell(content) {
  return `
    <aside class="sidebar">
      <a class="brand" href="#" data-view="home" aria-label="Go home">
        <span class="brand-mark">V</span>
        <span><strong>Viral</strong><em>Jar</em></span>
      </a>
      <a class="quick-action" href="#" data-view="onboarding">Run onboarding</a>
      <nav class="nav" aria-label="Dashboard">
        ${nav
          .map(
            ([key, label, icon]) => `
              <button class="${className("nav-item", state.activeView === key)}" data-view="${key}">
                <span class="nav-icon">${icon}</span>
                <span>${label}</span>
                ${key === "writer" ? `<small>AI</small>` : ""}
              </button>
            `
          )
          .join("")}
      </nav>
      <section class="pro-panel" aria-label="Upgrade">
        <p>Go Pro</p>
        <h2>Remove watermark.</h2>
        <span>PDF export · advanced analytics · priority leaderboard</span>
        <button data-view="settings">Upgrade</button>
      </section>
      <button class="x-button" id="openXConnect">${state.xConnect.profile ? `Connected ${state.xConnect.profile.handle}` : "Sign in with X"}</button>
    </aside>
    <main class="workspace">
      ${content}
    </main>
    ${state.xConnect.open ? xConnectModal() : ""}
  `;
}

function xConnectModal() {
  const connected = state.xConnect.profile;
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Connect X profile">
      <section class="x-modal">
        <header>
          <div>
            <p class="eyebrow">X profile analysis</p>
            <h2>${connected ? "Your reference map." : "Connect your X profile."}</h2>
          </div>
          <button class="icon-button" id="closeXConnect" title="Close">×</button>
        </header>
        <label>
          <span>Your X handle</span>
          <input id="xUsernameInput" value="${escapeHtml(state.xConnect.username)}" placeholder="@yourhandle" />
        </label>
        <button class="ink-button" id="analyzeXProfile" ${state.xConnect.status === "loading" ? "disabled" : ""}>
          ${state.xConnect.status === "loading" ? "Analyzing..." : "Analyze my X profile"}
        </button>
        ${state.xConnect.errors.length ? `<details class="search-errors" open><summary>Profile search status</summary><p>${state.xConnect.errors.map((error) => escapeHtml(error)).join("<br>")}</p></details>` : ""}
        ${connected ? xProfileResults() : `<p class="muted">This uses your public handle, reads your public profile through the X API, then finds similar profiles with at least 5K followers.</p>`}
      </section>
    </div>
  `;
}

function xProfileResults() {
  const profile = state.xConnect.profile;
  const analysis = state.xConnect.analysis;
  return `
    <section class="profile-result">
      <article class="profile-card">
        ${profile.imageUrl ? `<img src="${profile.imageUrl}" alt="${escapeHtml(profile.handle)} avatar" />` : ""}
        <div>
          <a href="${profile.profileUrl}" target="_blank" rel="noreferrer">${escapeHtml(profile.handle)}</a>
          <h3>${escapeHtml(profile.name)}</h3>
          <p>${escapeHtml(profile.description || "No public bio found.")}</p>
        </div>
        <footer>
          <span>${formatCount(profile.followers)} followers</span>
          <span>${formatCount(profile.posts)} posts</span>
        </footer>
      </article>
      ${
        analysis
          ? `<div class="profile-analysis-grid">
              <article>
                <p class="eyebrow">Archetype</p>
                <h3>${escapeHtml(analysis.archetype)}</h3>
                <p>${escapeHtml(analysis.positioning)}</p>
              </article>
              <article>
                <p class="eyebrow">Tone</p>
                <h3>${escapeHtml(analysis.tone)}</h3>
                <p>Recent average engagement: ${formatCount(analysis.metrics?.averageRecentEngagement || 0)}</p>
              </article>
              <article>
                <p class="eyebrow">Target demographic</p>
                <h3>${escapeHtml(analysis.targetDemographic.primary)}</h3>
                <p>${escapeHtml(analysis.targetDemographic.genderSkew)} · ages ${escapeHtml(analysis.targetDemographic.ageBand)}</p>
              </article>
              <article>
                <p class="eyebrow">Buyer stage</p>
                <h3>${escapeHtml(analysis.targetDemographic.buyerStage)}</h3>
                <p>${escapeHtml(analysis.targetDemographic.rationale)}</p>
              </article>
            </div>
            <div class="pillar-row">
              ${(analysis.contentPillars || []).map((pillar) => `<span>${escapeHtml(pillar)}</span>`).join("")}
            </div>
            <div class="insight-columns">
              <article>
                <p class="eyebrow">Strengths</p>
                ${(analysis.strengths || []).map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
              </article>
              <article>
                <p class="eyebrow">Gaps to improve</p>
                ${(analysis.gaps || []).map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
              </article>
            </div>`
          : ""
      }
      <div class="section-title">
        <p class="eyebrow">Similar profiles / ${escapeHtml(state.xConnect.query)}</p>
        <h2>Accounts to reference with 5K+ followers</h2>
      </div>
      ${
        state.xConnect.similar.length
          ? `<div class="handle-grid compact">
              ${state.xConnect.similar
                .map(
                  (item) => `
                    <a class="handle-card" href="${item.profileUrl}" target="_blank" rel="noreferrer">
                      <strong>${escapeHtml(item.handle)}</strong>
                      <span>${formatCount(item.followers)} followers · ${item.fit}% fit</span>
                      <p>${escapeHtml(item.reason)}</p>
                    </a>
                  `
                )
                .join("")}
            </div>`
          : `<div class="empty-mini">No similar profiles with 5K+ followers came back for this query yet. Try a clearer niche keyword in onboarding, then analyze again.</div>`
      }
      <div class="section-title">
        <p class="eyebrow">Viral posts to study</p>
        <h2>Use these structures as references</h2>
      </div>
      ${
        state.xConnect.recommendedPosts.length
          ? `<div class="reference-post-list">
              ${state.xConnect.recommendedPosts
                .map(
                  (post) => `
                    <article>
                      <header>
                        <a href="${post.profileUrl}" target="_blank" rel="noreferrer">${escapeHtml(post.author)}</a>
                        <a href="${post.postUrl}" target="_blank" rel="noreferrer">${formatCount(post.likes)} likes</a>
                      </header>
                      <pre>${escapeHtml(post.text)}</pre>
                      <footer>
                        <span>${escapeHtml(post.pattern)}</span>
                        <span>${formatCount(post.followers)} followers</span>
                      </footer>
                      <p><strong>Why refer:</strong> ${escapeHtml(post.whyReference)}</p>
                      <p><strong>Borrow:</strong> ${escapeHtml(post.borrow)}</p>
                      <p><strong>Avoid:</strong> ${escapeHtml(post.avoid)}</p>
                    </article>
                  `
                )
                .join("")}
            </div>`
          : `<div class="empty-mini">No high-fit viral reference posts found yet. Try a tighter niche keyword and analyze again.</div>`
      }
    </section>
  `;
}

function onboardingView() {
  const results = state.onboarding.results;
  const steps = ["X profile", "Niche", "Profile", "Photos", "X search", "Persona", "Drafts"];
  const step = state.onboarding.step;
  return `
    <section class="topline">
      <div>
        <p class="eyebrow">Onboarding / Step ${step + 1} of ${steps.length}</p>
        <h1>${step === 6 ? "Ready to write." : step === 0 ? "Connect your voice." : "Find your lane."}</h1>
      </div>
      <button class="ghost-button" id="restartOnboarding">Restart</button>
    </section>

    <section class="wizard-shell">
      <div class="step-meter" aria-label="Onboarding progress">
        ${steps
          .map(
            (label, index) => `
              <button class="${className("step-dot", index === step)}" data-step="${index}" ${index > step && !results ? "disabled" : ""}>
                <span>${index + 1}</span>
                <em>${label}</em>
              </button>
            `
          )
          .join("")}
      </div>

      ${onboardingStep(step, results)}
    </section>
  `;
}

function onboardingStep(step, results) {
  if (step === 0) {
    return `
      <article class="wizard-card">
        <p class="eyebrow">X profile analysis</p>
        <h2>Start by analyzing your X profile.</h2>
        <p class="muted">Enter your public handle. We’ll read your bio, follower count, and niche signals, then find similar profiles with at least 5K followers.</p>
        <div class="profile-connect-row">
          <label>
            <span>Your X handle</span>
            <input id="xUsernameInput" value="${escapeHtml(state.xConnect.username)}" placeholder="@yourhandle" />
          </label>
          <button class="ink-button" id="analyzeXProfile" ${state.xConnect.status === "loading" ? "disabled" : ""}>
            ${state.xConnect.status === "loading" ? "Analyzing..." : "Analyze profile"}
          </button>
        </div>
        ${state.xConnect.errors.length ? `<details class="search-errors" open><summary>Profile search status</summary><p>${state.xConnect.errors.map((error) => escapeHtml(error)).join("<br>")}</p></details>` : ""}
        ${state.xConnect.profile ? xProfileResults() : ""}
        ${wizardActions({ next: "Continue", disabled: state.xConnect.status === "loading" })}
      </article>
    `;
  }

  if (step === 1) {
    return `
      <article class="wizard-card">
        <p class="eyebrow">Niche keyword</p>
        <h2>What corner of X should we study for you?</h2>
        <p class="muted">Start narrow. The app will use this as the search seed for viral posts, comparable handles, and post structures.</p>
        <label>
          <span>Niche keyword</span>
          <input id="nicheInput" value="${escapeHtml(state.onboarding.niche)}" placeholder="AI productivity, fintech, design systems" />
        </label>
        ${wizardActions({ next: "Continue" })}
      </article>
    `;
  }

  if (step === 2) {
    return `
      <article class="wizard-card">
        <p class="eyebrow">Website and bio</p>
        <h2>Give the persona engine a source of truth.</h2>
        <p class="muted">The URL and bio help infer positioning, proof style, and the tone you can own.</p>
        <label>
          <span>Website URL</span>
          <input id="websiteInput" value="${escapeHtml(state.onboarding.website)}" placeholder="https://your-site.com" />
        </label>
        <label>
          <span>Bio / about text optional</span>
          <textarea id="bioInput" placeholder="What do you do, who do you help, and how do you sound?">${escapeHtml(state.onboarding.bio)}</textarea>
        </label>
        ${wizardActions({ back: true, next: "Continue" })}
      </article>
    `;
  }

  if (step === 3) {
    return `
      <article class="wizard-card">
        <p class="eyebrow">Camera roll</p>
        <h2>Add photos the drafts can pair with.</h2>
        <p class="muted">Portraits, work-in-progress shots, product screenshots, and proof artifacts all help the app recommend better visual pairings.</p>
        <label class="upload-zone">
          <span>Photos from camera roll</span>
          <input id="photoInput" type="file" accept="image/*" multiple />
          <strong>Drop in portraits, desk shots, screenshots, or product images.</strong>
          <em>Images stay local in this prototype.</em>
        </label>
        <div class="photo-strip">
          ${state.onboarding.photos
            .map(
              (photo, index) => `
                <figure>
                  <img src="${photo.url}" alt="${escapeHtml(photo.name)}" />
                  <figcaption>${escapeHtml(photo.name)}</figcaption>
                  <button type="button" data-remove-photo="${index}" title="Remove photo">×</button>
                </figure>
              `
            )
            .join("")}
        </div>
        ${state.onboarding.status === "searching" ? `<p class="search-note">Connecting to X search and filtering posts with more than 100 likes...</p>` : ""}
        ${wizardActions({ back: true, next: state.onboarding.status === "searching" ? "Searching..." : results ? "Continue" : "Analyze niche", analyze: !results, disabled: state.onboarding.status === "searching" })}
      </article>
    `;
  }

  if (step === 4) {
    return `
      <article class="wizard-card">
        <p class="eyebrow">X search / ${escapeHtml(results.searchedFor)}</p>
        <h2>Top viral posts and handles to reference.</h2>
        <p class="search-note">${results.source ? `Live source: ${escapeHtml(results.source)} · filtered by >100 likes` : "Live X search did not return parseable posts above 100 likes."}</p>
        ${results.errors.length ? `<details class="search-errors"><summary>Search attempts</summary><p>${results.errors.map((error) => escapeHtml(error)).join("<br>")}</p></details>` : ""}
        ${
          results.handles.length
            ? `<div class="handle-grid compact">
                ${results.handles
                  .map(
                    (item) => `
                      <a class="handle-card" href="${item.profileUrl}" target="_blank" rel="noreferrer">
                        <strong>${item.handle}</strong>
                        <span>${item.fit}% fit</span>
                        <p>${escapeHtml(item.reason)}</p>
                      </a>
                    `
                  )
                  .join("")}
              </div>`
            : `<div class="empty-mini">No clickable profiles found. Try a narrower niche or a different keyword.</div>`
        }
        ${
          results.viralPosts.length
            ? `<div class="viral-table">
                ${results.viralPosts
                  .map(
                    (post) => `
                      <article>
                        <header>
                          <a href="${post.profileUrl}" target="_blank" rel="noreferrer">${post.author}</a>
                          <a href="${post.postUrl}" target="_blank" rel="noreferrer">${post.rank} rank</a>
                        </header>
                        <pre>${escapeHtml(post.text)}</pre>
                        <footer>
                          <span>${post.likesLabel} likes</span>
                          <span>${post.repostsLabel} reposts</span>
                          <span>${post.repliesLabel} replies</span>
                          <span>${post.viewsLabel} views</span>
                        </footer>
                        <p>${escapeHtml(post.structure)}</p>
                      </article>
                    `
                  )
                  .join("")}
              </div>`
            : ""
        }
        <a class="x-search-link" href="https://x.com/search?q=${encodeURIComponent(`${results.searchedFor} min_faves:100`)}&src=typed_query&f=live" target="_blank" rel="noreferrer">Open this search on X</a>
        ${wizardActions({ back: true, next: "Analyze persona" })}
      </article>
    `;
  }

  if (step === 5) {
    return `
      <article class="wizard-card">
        <p class="eyebrow">Persona analysis</p>
        <h2>${escapeHtml(results.persona.archetype)}</h2>
        <div class="result-band single-row">
          <article>
            <p class="eyebrow">Positioning</p>
            <h2>${escapeHtml(results.persona.positioning)}</h2>
            <strong>${escapeHtml(results.persona.tone)}</strong>
          </article>
          <article>
            <p class="eyebrow">Website signal</p>
            <h2>${escapeHtml(results.websiteSignal)}</h2>
            <p>${escapeHtml(results.persona.bioSignal)}</p>
          </article>
          <article>
            <p class="eyebrow">Image read</p>
            <h2>${results.imageSummaries.length} assets</h2>
            <p>${results.imageSummaries.map((item) => escapeHtml(item.summary)).join(" · ")}</p>
          </article>
        </div>
        ${wizardActions({ back: true, next: "Generate drafts" })}
      </article>
    `;
  }

  return `
    <article class="wizard-card">
      <p class="eyebrow">Generated drafts</p>
      <h2>Five original posts with photo matches.</h2>
      <div class="draft-list">
        ${results.drafts
          .map(
            (draft, index) => `
              <article class="draft-card">
                <header>
                  <div>
                    <p class="eyebrow">${escapeHtml(draft.source)}</p>
                    <h3>${index + 1}. ${escapeHtml(draft.title)}</h3>
                  </div>
                  <button class="icon-button" data-copy-draft="${index}" title="Copy draft">⧉</button>
                </header>
                <pre>${escapeHtml(draft.text)}</pre>
                <footer>
                  <strong>Photo: ${escapeHtml(draft.photo)}</strong>
                  <span>${escapeHtml(draft.why)}</span>
                </footer>
              </article>
            `
          )
          .join("")}
      </div>
      <div class="wizard-actions">
        <button class="ghost-button" id="prevOnboarding">Back</button>
        <button class="ink-button" id="finishOnboarding">Finish and enter dashboard</button>
      </div>
    </article>
  `;
}

function wizardActions({ back = false, next = "Continue", analyze = false, disabled = false }) {
  return `
    <div class="wizard-actions">
      ${back ? `<button class="ghost-button" id="prevOnboarding">Back</button>` : `<span></span>`}
      <button class="ink-button" id="${analyze ? "analyzeOnboarding" : "nextOnboarding"}" ${disabled ? "disabled" : ""}>${next}</button>
    </div>
  `;
}

function emptyOnboardingResults() {
  return `
    <section class="empty-state onboarding-empty">
      <div class="paper-stack" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <h2>Run onboarding to discover the handles, post structures, and photo pairings worth studying.</h2>
      <p>This local prototype simulates the X search and AI reasoning. A production build would connect this step to Twitter/X search APIs and a multimodal model.</p>
    </section>
  `;
}

function onboardingResults(results) {
  return `
    <section class="result-band">
      <article>
        <p class="eyebrow">Persona</p>
        <h2>${escapeHtml(results.persona.archetype)}</h2>
        <p>${escapeHtml(results.persona.positioning)}</p>
        <strong>${escapeHtml(results.persona.tone)}</strong>
      </article>
      <article>
        <p class="eyebrow">Website signal</p>
        <h2>${escapeHtml(results.websiteSignal)}</h2>
        <p>${escapeHtml(results.persona.bioSignal)}</p>
      </article>
      <article>
        <p class="eyebrow">Image read</p>
        <h2>${results.imageSummaries.length} assets</h2>
        <p>${results.imageSummaries.map((item) => escapeHtml(item.summary)).join(" · ")}</p>
      </article>
    </section>

    <section class="analysis-section">
      <div class="section-title">
        <p class="eyebrow">Handles to reference</p>
        <h2>Creators this persona can learn from</h2>
      </div>
      <div class="handle-grid">
        ${results.handles
          .map(
            (item) => `
              <article>
                <strong>${item.handle}</strong>
                <span>${item.fit}% fit</span>
                <p>${escapeHtml(item.reason)}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>

    <section class="analysis-section">
      <div class="section-title">
        <p class="eyebrow">X search / ${escapeHtml(results.searchedFor)}</p>
        <h2>Top viral post structures</h2>
      </div>
      <div class="viral-table">
        ${results.viralPosts
          .map(
            (post) => `
              <article>
                <header>
                  <strong>${post.author}</strong>
                  <span>${post.score} rank</span>
                </header>
                <pre>${escapeHtml(post.text)}</pre>
                <footer>
                  <span>${post.likes} likes</span>
                  <span>${post.reposts} reposts</span>
                  <span>${post.replies} replies</span>
                  <span>${post.views} views</span>
                </footer>
                <p>${escapeHtml(post.structure)}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>

    <section class="analysis-section">
      <div class="section-title">
        <p class="eyebrow">Generated drafts</p>
        <h2>Five original posts with photo matches</h2>
      </div>
      <div class="draft-list">
        ${results.drafts
          .map(
            (draft, index) => `
              <article class="draft-card">
                <header>
                  <div>
                    <p class="eyebrow">${escapeHtml(draft.source)}</p>
                    <h3>${index + 1}. ${escapeHtml(draft.title)}</h3>
                  </div>
                  <button class="icon-button" data-copy-draft="${index}" title="Copy draft">⧉</button>
                </header>
                <pre>${escapeHtml(draft.text)}</pre>
                <footer>
                  <strong>Photo: ${escapeHtml(draft.photo)}</strong>
                  <span>${escapeHtml(draft.why)}</span>
                </footer>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function viralView() {
  if (!state.hasVisual) {
    return `
      <section class="topline">
        <div>
          <p class="eyebrow">Dashboard / Create</p>
          <h1>Viral Engine.</h1>
        </div>
        <button class="ink-button" id="unlockVisual">Create visualization</button>
      </section>
      <section class="empty-state">
        <div class="paper-stack" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
        <h2>Create a visualization first to unlock the tweet generator.</h2>
        <p>Map the idea, choose the audience, then let the engine turn the strongest angle into post variants.</p>
        <button class="ink-button" id="unlockVisual2">Start visual</button>
      </section>
    `;
  }

  return `
    <section class="topline">
      <div>
        <p class="eyebrow">Dashboard / Viral</p>
        <h1>Viral Engine.</h1>
      </div>
      <div class="top-actions">
        <button class="ghost-button" id="resetVisual">Reset visual</button>
        <button class="ink-button" id="generatePosts">Generate posts</button>
      </div>
    </section>

    <section class="engine-grid">
      <form class="composer" id="composer">
        <label>
          <span>Core idea</span>
          <textarea id="topic">${escapeHtml(state.topic)}</textarea>
        </label>
        <label>
          <span>Audience</span>
          <input id="audience" value="${escapeHtml(state.audience)}" />
        </label>
        <div class="field-row">
          <label>
            <span>Tone</span>
            <select id="tone">
              ${["Sharp", "Warm", "Analytical"].map((tone) => `<option ${tone === state.selectedTone ? "selected" : ""}>${tone}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>Length</span>
            <select id="length">
              ${["Short", "Medium", "Long"].map((length) => `<option ${length === state.selectedLength ? "selected" : ""}>${length}</option>`).join("")}
            </select>
          </label>
        </div>
      </form>
      <aside class="insights">
        <p class="eyebrow">Visual score</p>
        <strong>84</strong>
        <span>Hook clarity and specificity are strong. Add one measurable result before publishing.</span>
        <div class="score-bars">
          <i style="--value: 88%"></i>
          <i style="--value: 76%"></i>
          <i style="--value: 94%"></i>
        </div>
      </aside>
    </section>

    <section class="post-list">
      ${(state.posts.length ? state.posts : seedPosts())
        .map(
          (post) => `
            <article class="post-card">
              <header>
                <div>
                  <p class="eyebrow">${escapeHtml(post.title)}</p>
                  <h2>${post.score}% predicted fit</h2>
                </div>
                <button class="icon-button" data-copy="${post.id}" title="Copy post">⧉</button>
              </header>
              <pre>${escapeHtml(post.text)}</pre>
              <footer>
                <span>${post.saves} saves</span>
                <span>${post.replies} replies</span>
                <button class="queue-button" data-queue="${post.id}">Queue</button>
              </footer>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function seedPosts() {
  if (!state.posts.length) generatePosts();
  return state.posts;
}

function simpleView(title, subtitle, body) {
  return `
    <section class="topline">
      <div>
        <p class="eyebrow">Dashboard</p>
        <h1>${title}</h1>
      </div>
    </section>
    <section class="plain-panel">
      <h2>${subtitle}</h2>
      ${body}
    </section>
  `;
}

function libraryView() {
  const library = state.library;
  const niche = state.onboarding.niche || "AI productivity";
  const updated = library.updatedAt ? new Date(library.updatedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Not synced yet";
  const next = library.nextUpdateAt ? new Date(library.nextUpdateAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "After first sync";

  return `
    <section class="topline">
      <div>
        <p class="eyebrow">Dashboard / Library</p>
        <h1>Library.</h1>
      </div>
      <button class="ink-button" id="refreshLibrary" ${library.status === "loading" ? "disabled" : ""}>
        ${library.status === "loading" ? "Scraping X..." : "Refresh from X"}
      </button>
    </section>
    <section class="plain-panel">
      <div class="section-title">
        <div>
          <p class="eyebrow">Niche / ${escapeHtml(niche)}</p>
          <h2>Daily viral post library</h2>
        </div>
        <p class="muted">Updated: ${escapeHtml(updated)}<br>Next automatic refresh: ${escapeHtml(next)}</p>
      </div>
      ${library.errors.length ? `<details class="search-errors"><summary>Library sync status</summary><p>${library.errors.map((error) => escapeHtml(error)).join("<br>")}</p></details>` : ""}
      ${
        library.posts.length
          ? `<div class="viral-library-grid">
              ${library.posts
                .map(
                  (post) => `
                    <article class="library-post-card">
                      <header>
                        <a href="${post.profileUrl}" target="_blank" rel="noreferrer">${escapeHtml(post.author)}</a>
                        <a href="${post.postUrl}" target="_blank" rel="noreferrer">#${post.rank}</a>
                      </header>
                      <pre>${escapeHtml(post.text)}</pre>
                      <footer>
                        <span>${formatCount(post.likes)} likes</span>
                        <span>${formatCount(post.reposts)} reposts</span>
                        <span>${formatCount(post.replies)} replies</span>
                        <span>${post.views ? formatCount(post.views) : "n/a"} views</span>
                      </footer>
                      <p>${escapeHtml(post.structure)}</p>
                    </article>
                  `
                )
                .join("")}
            </div>`
          : `<div class="empty-mini">${library.status === "loading" ? "Scraping the most viral posts in your niche..." : "No library posts yet. Refresh from X to build today’s swipe file."}</div>`
      }
    </section>
  `;
}

function currentView() {
  if (state.activeView === "onboarding") return onboardingView();
  if (state.activeView === "viral") return viralView();
  if (state.activeView === "queue") {
    return simpleView(
      "Queue.",
      "Scheduled posts",
      `<div class="table">${state.queued.map((item) => `<p><span>${escapeHtml(item.time)}</span><strong>${escapeHtml(item.title)}</strong><em>${escapeHtml(item.status)}</em></p>`).join("")}</div>`
    );
  }
  if (state.activeView === "library") {
    return libraryView();
  }
  if (state.activeView === "visual") {
    return simpleView(
      "New visual.",
      "Build the proof artifact",
      `<div class="visual-builder"><button class="ink-button" id="unlockVisual3">Create sample visualization</button><p>This unlocks the Viral Engine and generates post angles from your proof map.</p></div>`
    );
  }
  if (state.activeView === "analyze") {
    return simpleView(
      "Analyze.",
      "Growth snapshot",
      `<div class="metrics"><article><span>Avg. saves</span><strong>38</strong></article><article><span>Reply rate</span><strong>7.4%</strong></article><article><span>Best hook</span><strong>Proof</strong></article></div>`
    );
  }
  return simpleView(
    `${nav.find(([key]) => key === state.activeView)?.[1] || "Home"}.`,
    "Workspace",
    `<p class="muted">This area is wired into the dashboard shell so the navigation behaves like the GrowthX app while the visual treatment stays quiet and paper-like.</p>`
  );
}

function syncOnboardingInputs() {
  const niche = document.getElementById("nicheInput");
  const website = document.getElementById("websiteInput");
  const bio = document.getElementById("bioInput");
  if (niche) state.onboarding.niche = niche.value;
  if (website) state.onboarding.website = website.value;
  if (bio) state.onboarding.bio = bio.value;
}

async function loadLibrary(force = false) {
  const niche = state.onboarding.niche || "AI productivity";
  if (state.library.status === "loading") return;
  if (!force && state.library.posts.length && state.library.niche === niche) return;

  state.library.status = "loading";
  state.library.niche = niche;
  render();

  try {
    const response = await fetch(`/api/library?niche=${encodeURIComponent(niche)}&minLikes=100${force ? "&refresh=1" : ""}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.errors?.[0] || "Library sync failed");
    state.library.status = "complete";
    state.library.source = result.source || "";
    state.library.updatedAt = result.updatedAt || "";
    state.library.nextUpdateAt = result.nextUpdateAt || "";
    state.library.posts = result.posts || [];
    state.library.errors = result.errors || [];
  } catch (error) {
    state.library.status = "error";
    state.library.errors = [error.message];
  }

  render();
}

function bindEvents() {
  document.getElementById("openXConnect")?.addEventListener("click", () => {
    state.xConnect.open = true;
    render();
  });

  document.getElementById("closeXConnect")?.addEventListener("click", () => {
    state.xConnect.open = false;
    render();
  });

  document.getElementById("analyzeXProfile")?.addEventListener("click", async () => {
    const username = document.getElementById("xUsernameInput")?.value.trim() || "";
    state.xConnect.username = username;
    state.xConnect.status = "loading";
    state.xConnect.errors = [];
    render();

    try {
      const response = await fetch(`/api/x-profile?username=${encodeURIComponent(username)}&niche=${encodeURIComponent(state.onboarding.niche)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "X profile analysis failed");
      state.xConnect.profile = result.profile;
      state.xConnect.similar = result.similar || [];
      state.xConnect.analysis = result.analysis || null;
      state.xConnect.recommendedPosts = result.recommendedPosts || [];
      state.xConnect.ownTweets = result.ownTweets || [];
      state.xConnect.query = result.query || state.onboarding.niche;
      state.xConnect.errors = result.errors || [];
      state.onboarding.bio = result.profile?.description || state.onboarding.bio;
      state.xConnect.open = false;
    } catch (error) {
      state.xConnect.errors = [error.message];
    }

    state.xConnect.status = "complete";
    render();
  });

  document.getElementById("refreshLibrary")?.addEventListener("click", () => {
    loadLibrary(true);
  });

  document.querySelectorAll("[data-view]").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault();
      setView(el.dataset.view);
    });
  });

  ["unlockVisual", "unlockVisual2", "unlockVisual3"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", () => {
      state.hasVisual = true;
      state.activeView = "viral";
      generatePosts();
      render();
    });
  });

  document.getElementById("photoInput")?.addEventListener("change", (event) => {
    const files = [...event.target.files].filter((file) => file.type.startsWith("image/")).slice(0, 6);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        state.onboarding.photos.push({ name: file.name, url: reader.result });
        render();
      });
      reader.readAsDataURL(file);
    });
  });

  document.querySelectorAll("[data-remove-photo]").forEach((button) => {
    button.addEventListener("click", () => {
      state.onboarding.photos.splice(Number(button.dataset.removePhoto), 1);
      render();
    });
  });

  document.querySelectorAll("[data-step]").forEach((button) => {
    button.addEventListener("click", () => {
      syncOnboardingInputs();
      state.onboarding.step = Number(button.dataset.step);
      render();
    });
  });

  document.getElementById("restartOnboarding")?.addEventListener("click", () => {
    state.onboarding.step = 0;
    state.onboarding.status = "idle";
    state.onboarding.xSource = null;
    state.onboarding.xError = null;
    state.onboarding.results = null;
    render();
  });

  document.getElementById("prevOnboarding")?.addEventListener("click", () => {
    syncOnboardingInputs();
    state.onboarding.step = Math.max(0, state.onboarding.step - 1);
    render();
  });

  document.getElementById("nextOnboarding")?.addEventListener("click", () => {
    syncOnboardingInputs();
    state.onboarding.step = Math.min(6, state.onboarding.step + 1);
    render();
  });

  document.getElementById("analyzeOnboarding")?.addEventListener("click", async () => {
    syncOnboardingInputs();
    state.onboarding.status = "searching";
    state.onboarding.xError = null;
    render();

    let liveSearch = { tweets: [], handles: [], source: null, errors: [] };
    try {
      const response = await fetch(`/api/x-search?q=${encodeURIComponent(state.onboarding.niche)}&minLikes=100`);
      liveSearch = await response.json();
      if (!response.ok) {
        throw new Error(liveSearch.error || "X search failed");
      }
    } catch (error) {
      liveSearch.errors = [...(liveSearch.errors || []), error.message];
      state.onboarding.xError = error.message;
    }

    state.onboarding.status = liveSearch.tweets?.length ? "complete" : "error";
    state.onboarding.xSource = liveSearch.source || null;
    state.onboarding.results = buildOnboardingAnalysis(liveSearch);
    state.hasVisual = true;
    state.topic = `Create a proof-led post for ${state.onboarding.niche || "my niche"}`;
    state.audience = state.onboarding.results.persona.positioning;
    state.onboarding.step = 4;
    generatePosts();
    render();
  });

  document.getElementById("finishOnboarding")?.addEventListener("click", () => {
    state.hasVisual = true;
    state.activeView = "viral";
    if (!state.posts.length) generatePosts();
    render();
  });

  document.getElementById("resetVisual")?.addEventListener("click", () => {
    state.hasVisual = false;
    state.posts = [];
    render();
  });

  document.getElementById("generatePosts")?.addEventListener("click", () => {
    state.topic = document.getElementById("topic").value;
    state.audience = document.getElementById("audience").value;
    state.selectedTone = document.getElementById("tone").value;
    state.selectedLength = document.getElementById("length").value;
    generatePosts();
    render();
  });

  document.querySelectorAll("[data-queue]").forEach((button) => {
    button.addEventListener("click", () => {
      const post = state.posts.find((item) => item.id === button.dataset.queue);
      state.queued.unshift({ time: "Next open slot", title: post?.title || "Generated post", status: "Ready" });
      button.textContent = "Queued";
    });
  });

  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const post = state.posts.find((item) => item.id === button.dataset.copy);
      await navigator.clipboard?.writeText(post?.text || "");
      button.textContent = "✓";
    });
  });

  document.querySelectorAll("[data-copy-draft]").forEach((button) => {
    button.addEventListener("click", async () => {
      const draft = state.onboarding.results?.drafts[Number(button.dataset.copyDraft)];
      await navigator.clipboard?.writeText(draft?.text || "");
      button.textContent = "✓";
    });
  });
}

function render() {
  document.getElementById("app").innerHTML = shell(currentView());
  bindEvents();
}

render();
