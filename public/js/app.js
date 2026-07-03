// ---------- State ----------
const state = {
    docs: [],       // [{name, text}]
    activeIndex: null
};

document.getElementById('docket-number').textContent =
    `No. ${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

// ---------- DOM refs ----------
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const docList = document.getElementById('doc-list');
const actionsSection = document.getElementById('actions');
const activeDocName = document.getElementById('active-doc-name');
const resultsSection = document.getElementById('results');
const compareBtn = document.getElementById('compare-btn');

// ---------- Upload handling ----------
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length) uploadFile(fileInput.files[0]);
    fileInput.value = '';
});

async function uploadFile(file) {
    dropZone.querySelector('.drop-label').textContent = `Uploading ${file.name}...`;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Upload failed');
            resetDropZone();
            return;
        }

        state.docs.push({ name: data.filename, text: data.text });
        state.activeIndex = state.docs.length - 1;
        renderDocList();
        selectDoc(state.activeIndex);
        resetDropZone();
    } catch (err) {
        alert('Upload failed: ' + err.message);
        resetDropZone();
    }
}

function resetDropZone() {
    dropZone.querySelector('.drop-label').textContent = 'Drop a contract here, or click to browse';
}

// ---------- Document list / selection ----------
function renderDocList() {
    docList.innerHTML = '';
    state.docs.forEach((doc, i) => {
        const chip = document.createElement('div');
        chip.className = 'doc-chip' + (i === state.activeIndex ? ' active' : '');
        chip.textContent = doc.name;
        chip.addEventListener('click', () => selectDoc(i));
        docList.appendChild(chip);
    });
    compareBtn.disabled = state.docs.length < 2;
    compareBtn.textContent = state.docs.length < 2
        ? 'Compare Documents (needs 2+)'
        : `Compare ${state.docs.length} Documents`;
}

function selectDoc(index) {
    state.activeIndex = index;
    renderDocList();
    actionsSection.classList.remove('hidden');
    activeDocName.textContent = `Active document: ${state.docs[index].name}`;
}

// ---------- Analysis buttons ----------
document.querySelectorAll('.analyze-btn[data-type]').forEach(btn => {
    btn.addEventListener('click', () => runAnalysis(btn.dataset.type, btn));
});
compareBtn.addEventListener('click', () => runCompare(compareBtn));

const ENDPOINTS = {
    clauses: '/api/analyze/clauses',
    risk: '/api/analyze/risk',
    compliance: '/api/analyze/compliance',
    citations: '/api/analyze/citations'
};

const AVATAR_SVG = `<svg viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="19" fill="#16233B" stroke="#A9823C" stroke-width="1"/>
    <text x="20" y="27" text-anchor="middle" font-family="Fraunces, serif" font-size="17" font-weight="600" fill="#A9823C">A</text>
</svg>`;

const AILA_INTROS = {
    clauses: "I pulled out the key clauses from this contract.",
    risk: "Here's how risky I think this contract is.",
    compliance: "I checked this against standard compliance practices.",
    citations: "I checked the legal references mentioned in this document.",
    compare: "I compared these documents and here's what I found."
};

async function runAnalysis(type, btn) {
    if (state.activeIndex === null) return;
    const text = state.docs[state.activeIndex].text;

    setLoading(btn, true);
    showTyping(type);
    try {
        const res = await fetch(ENDPOINTS[type], {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        const data = await res.json();
        renderResult(type, data);
    } catch (err) {
        renderError(type, err.message);
    } finally {
        setLoading(btn, false);
    }
}

async function runCompare(btn) {
    setLoading(btn, true);
    showTyping('compare');
    try {
        const res = await fetch('/api/analyze/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documents: state.docs })
        });
        const data = await res.json();
        renderResult('compare', data);
    } catch (err) {
        renderError('compare', err.message);
    } finally {
        setLoading(btn, false);
    }
}

function setLoading(btn, isLoading) {
    btn.classList.toggle('loading', isLoading);
    btn.disabled = isLoading;
    if (isLoading) btn.dataset.originalText = btn.textContent, btn.textContent = 'Analyzing...';
    else if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
}

// ---------- Aila message rendering ----------
function showTyping(type) {
    const wrapper = document.createElement('div');
    wrapper.className = 'aila-message aila-typing';
    wrapper.dataset.typingFor = type;
    wrapper.innerHTML = `
        <div class="aila-avatar">${AVATAR_SVG}</div>
        <div class="aila-bubble">
            <div class="aila-name">AILA</div>
            <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>
    `;
    resultsSection.prepend(wrapper);
}

function removeTyping(type) {
    const el = resultsSection.querySelector(`.aila-typing[data-typing-for="${type}"]`);
    if (el) el.remove();
}

function wrapAsAilaMessage(type, innerEl, introOverride) {
    const wrapper = document.createElement('div');
    wrapper.className = 'aila-message';
    wrapper.innerHTML = `
        <div class="aila-avatar">${AVATAR_SVG}</div>
        <div class="aila-bubble">
            <div class="aila-name">AILA</div>
            <p class="aila-intro">${escapeHtml(introOverride || AILA_INTROS[type] || '')}</p>
        </div>
    `;
    wrapper.querySelector('.aila-bubble').appendChild(innerEl);
    resultsSection.prepend(wrapper);
}

function renderError(type, message) {
    removeTyping(type);
    const card = document.createElement('div');
    card.className = 'result-card error-card';
    card.innerHTML = `
        <p>${escapeHtml(message)}</p>
        <button class="retry-btn" data-type="${escapeHtml(type)}">Try Again</button>
    `;
    card.querySelector('.retry-btn').addEventListener('click', () => {
        card.closest('.aila-message').remove();
        if (type === 'compare') runCompare(compareBtn);
        else runAnalysis(type, document.querySelector(`.analyze-btn[data-type="${type}"]`));
    });
    wrapAsAilaMessage(type, card, "I ran into a problem completing this analysis:");
}

function renderResult(type, data) {
    removeTyping(type);
    if (data.error) return renderError(type, data.error);

    const card = document.createElement('div');
    card.className = 'result-card';

    if (type === 'clauses') card.innerHTML = renderClauses(data);
    else if (type === 'risk') card.innerHTML = renderRisk(data);
    else if (type === 'compliance') card.innerHTML = renderCompliance(data);
    else if (type === 'citations') card.innerHTML = renderCitations(data);
    else if (type === 'compare') card.innerHTML = renderCompare(data);

    wrapAsAilaMessage(type, card);
}

// ---------- Result-type renderers ----------
function renderClauses(data) {
    const items = (data.clauses || []).map(c => `
        <div class="clause-item">
            <div class="item-title">${escapeHtml(c.type)}</div>
            <div class="item-detail">${escapeHtml(c.summary)}</div>
            <div class="item-detail"><em>${escapeHtml(c.location || '')}</em></div>
        </div>
    `).join('');
    return `<h3>Extracted Clauses (${data.clauses?.length || 0})</h3>${items || '<p>No clauses found.</p>'}`;
}

function renderRisk(data) {
    const items = (data.risks || []).map(r => `
        <div class="risk-item" data-sev="${escapeHtml(r.severity)}">
            <span class="risk-badge risk-${r.severity}">${escapeHtml(r.severity)}</span>
            <div class="item-title">${escapeHtml(r.category)}</div>
            <div class="item-detail">${escapeHtml(r.description)}</div>
            <div class="item-detail"><strong>Recommendation:</strong> ${escapeHtml(r.recommendation)}</div>
        </div>
    `).join('');
    const score = data.overall_risk_score ?? '?';
    const tier = score <= 33 ? 'low' : score <= 66 ? 'medium' : 'high';
    return `
        <h3>Risk Assessment</h3>
        <div class="stamp stamp-${tier}">
            <span class="stamp-score">${score}</span>
            <span class="stamp-label">/ 100 risk</span>
        </div>
        <p class="item-detail">${escapeHtml(data.overall_summary || '')}</p>
        ${items}
    `;
}

function renderCompliance(data) {
    const issues = (data.issues || []).map(i => `
        <div class="issue-item" data-sev="${escapeHtml(i.severity)}">
            <span class="risk-badge risk-${i.severity}">${escapeHtml(i.severity)}</span>
            <div class="item-title">${escapeHtml(i.issue)}</div>
            <div class="item-detail">${escapeHtml(i.why_it_matters)}</div>
        </div>
    `).join('');
    const missing = (data.missing_clauses || []).map(m => `<li>${escapeHtml(m)}</li>`).join('');
    const score = data.compliance_score ?? '?';
    const tier = score >= 67 ? 'good' : score >= 34 ? 'medium' : 'bad';
    return `
        <h3>Compliance Check</h3>
        <div class="stamp stamp-${tier}">
            <span class="stamp-score">${score}</span>
            <span class="stamp-label">/ 100 compliant</span>
        </div>
        ${issues}
        ${missing ? `<p class="item-title" style="margin-top:12px;">Missing Clauses</p><ul>${missing}</ul>` : ''}
    `;
}

function renderCitations(data) {
    const items = (data.citations || []).map(c => `
        <div class="citation-item">
            <div class="item-title">${escapeHtml(c.citation)}</div>
            <div class="item-detail">References: ${escapeHtml(c.referenced_law_or_doc || 'unclear')}</div>
            <span class="risk-badge risk-${c.context_assessment === 'plausible' ? 'low' : 'medium'}">${escapeHtml(c.context_assessment)}</span>
            <div class="item-detail">${escapeHtml(c.note || '')}</div>
        </div>
    `).join('');
    return `<h3>Citation Check (${data.citations?.length || 0} found)</h3>${items || '<p>No citations found.</p>'}
        <p class="item-detail" style="margin-top:8px;"><em>Note: this checks plausibility from context only, not against live legal databases.</em></p>`;
}

function renderCompare(data) {
    const items = (data.conflicts || []).map(c => `
        <div class="issue-item">
            <div class="item-title">${escapeHtml(c.issue)}</div>
            <div class="item-detail">Documents: ${(c.documents_involved || []).map(escapeHtml).join(', ')}</div>
            <div class="item-detail">${escapeHtml(c.details)}</div>
        </div>
    `).join('');
    return `<h3>Document Comparison</h3><p class="item-detail">${escapeHtml(data.summary || '')}</p>${items}`;
}

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
