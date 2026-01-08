// ==========================================================================
// 1. CONFIGURAÇÃO E CONEXÃO FIREBASE
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyCXb4TRE4HcIRjqv5DqvYIr0jxgEuvnhPw",
    authDomain: "sistema-shield.firebaseapp.com",
    projectId: "sistema-shield",
    storageBucket: "sistema-shield.firebasestorage.app",
    messagingSenderId: "1041018025450",
    appId: "1:1041018025450:web:a03a48413628a5f3e96e93"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let editingAgentId = null; // Controle de edição de agentes

// ==========================================================================
// 2. INICIALIZAÇÃO DO SISTEMA
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const intro = document.getElementById('intro-overlay');
    setTimeout(() => { if (intro) intro.style.display = 'none'; }, 2000);

    // Sincronização em tempo real
    syncCollection('missions');
    syncCollection('agents');
    syncCollection('finance');
    syncCollection('armory');
    syncCollection('docs');
});

function syncCollection(collection) {
    db.collection(collection).orderBy('timestamp', 'desc').onSnapshot(snapshot => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderContent(collection, data);
    });
}

// ==========================================================================
// 3. LOGICA DE PESQUISA GLOBAL
// ==========================================================================
function filterGlobal(containerId, term) {
    const searchTerm = term.toLowerCase();
    const container = document.getElementById(containerId);
    if (!container) return;

    const cards = container.querySelectorAll('.card');
    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(searchTerm) ? "" : "none";
    });
}

// ==========================================================================
// 4. FUNÇÕES DE SALVAMENTO (TODAS AS CATEGORIAS)
// ==========================================================================

async function saveData(collection, obj) {
    try {
        if (collection === 'agents' && editingAgentId) {
            await db.collection(collection).doc(editingAgentId).update(obj);
            editingAgentId = null;
        } else {
            await db.collection(collection).add({ ...obj, timestamp: new Date().getTime() });
        }
    } catch (e) { console.error("Erro ao processar operação:", e); }
}

function saveMission() {
    const title = document.getElementById('m-title').value;
    const desc = document.getElementById('m-desc').value;
    if (!title) return alert("Título obrigatório!");
    saveData('missions', { title, desc, status: 'ativa' });
    closeModal('mission-modal');
    document.getElementById('m-title').value = '';
    document.getElementById('m-desc').value = '';
}

function saveAgent() {
    const name = document.getElementById('a-name').value;
    const agentId = document.getElementById('a-id').value;
    const role = document.getElementById('a-role').value;
    const fileInput = document.getElementById('a-image');
    const file = fileInput.files[0];
    const courses = Array.from(document.querySelectorAll('.course-chip input:checked')).map(el => el.value);

    if (!name || !agentId) return alert("Nome e ID são obrigatórios!");

    const executeSave = (imageData = null) => {
        const agentData = { name, agentId, role, courses };
        if (imageData) agentData.image = imageData;
        saveData('agents', agentData);
        closeModal('agent-modal');
        resetAgentForm();
    };

    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => executeSave(reader.result);
        reader.readAsDataURL(file);
    } else {
        executeSave(); 
    }
}

async function editAgent(id) {
    editingAgentId = id;
    const doc = await db.collection('agents').doc(id).get();
    const a = doc.data();

    document.getElementById('a-name').value = a.name;
    document.getElementById('a-id').value = a.agentId;
    document.getElementById('a-role').value = a.role;
    document.querySelectorAll('.course-chip input').forEach(el => {
        el.checked = (a.courses || []).includes(el.value);
    });

    document.querySelector('#agent-modal h3').innerText = "EDITAR PERFIL DO AGENTE";
    openModal('agent-modal');
}

function saveArmory() {
    const type = document.getElementById('a-type').value;
    const model = document.getElementById('a-model').value;
    const price = parseFloat(document.getElementById('a-price').value) || 0;
    const qty = parseInt(document.getElementById('a-qty').value) || 0;
    if (!model) return alert("Modelo obrigatório!");
    saveData('armory', { type, model, unitPrice: price, quantity: qty });
    closeModal('armory-modal');
}

function saveFinance() {
    const amount = parseFloat(document.getElementById('f-amount').value) || 0;
    const desc = document.getElementById('f-desc').value;
    if (!desc) return alert("Descrição obrigatória!");
    saveData('finance', { amount, desc });
    closeModal('finance-modal');
}

function saveDoc() {
    const title = document.getElementById('d-title').value;
    const desc = document.getElementById('d-desc').value;
    saveData('docs', { title, desc });
    closeModal('doc-modal');
}

// ==========================================================================
// 5. RENDERIZAÇÃO DINÂMICA (UI)
// ==========================================================================

function renderContent(collection, data) {
    // Contadores Dashboard
    if (collection === 'missions') document.getElementById('count-missions').innerText = data.length;
    if (collection === 'agents') document.getElementById('count-agents').innerText = data.length;
    if (collection === 'docs') document.getElementById('count-docs').innerText = data.length;

    // Render Agentes
    if (collection === 'agents') {
        const cont = document.getElementById('agents-container');
        if (cont) cont.innerHTML = data.map(a => `
            <div class="card agent-card" style="padding: 15px;">
                <div style="width:100%; aspect-ratio: 6/4; overflow:hidden; border-radius: 8px; border: 1px solid #222; margin-bottom:10px;">
                    <img src="${a.image || ''}" style="width:100%; height:100%; object-fit: cover;">
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <small style="color:#555;">ID: ${a.agentId}</small>
                    <span style="font-size:0.6rem; color:#00ffff; background:#00ffff11; padding:2px 5px; border-radius:4px;">${(a.role || '').toUpperCase()}</span>
                </div>
                <h3 style="margin:10px 0;">${a.name}</h3>
                <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:12px;">
                    ${(a.courses || []).map(c => `<span style="font-size:0.5rem; background:#222; padding:2px 5px; border-radius:3px;">${c.toUpperCase()}</span>`).join('')}
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <button class="btn-save" style="font-size:0.6rem; padding:5px;" onclick="editAgent('${a.id}')">EDITAR</button>
                    <button class="btn-delete" style="font-size:0.6rem; padding:5px;" onclick="deleteRemote('agents', '${a.id}')">REMOVER</button>
                </div>
            </div>`).join('');
    }

    // Render Arsenal
    if (collection === 'armory') {
        const weapons = data.filter(i => i.type === 'arma');
        const ammo = data.filter(i => i.type === 'municao');
        const totalW = weapons.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice || 0), 0);
        const totalA = ammo.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice || 0), 0);

        if(document.getElementById('total-weapons-money')) document.getElementById('total-weapons-money').innerText = `$ ${totalW.toLocaleString()}`;
        if(document.getElementById('total-ammo-money')) document.getElementById('total-ammo-money').innerText = `$ ${totalA.toLocaleString()}`;

        const cardHTML = (item) => `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div style="flex:2"><h4>${item.model.toUpperCase()}</h4><small style="color:#00ff00;">$ ${(item.quantity * item.unitPrice).toLocaleString()}</small></div>
                <div style="flex:1; text-align:right;"><p style="margin:0; font-size:0.6rem; color:#888;">QTD</p><h3>${item.quantity}</h3></div>
                <button class="btn-delete" style="margin-left:10px;" onclick="deleteRemote('armory', '${item.id}')">✕</button>
            </div>`;

        if(document.getElementById('weapons-container')) document.getElementById('weapons-container').innerHTML = weapons.map(cardHTML).join('');
        if(document.getElementById('ammo-container')) document.getElementById('ammo-container').innerHTML = ammo.map(cardHTML).join('');
    }

    // Render Missões
    if (collection === 'missions') {
        const cont = document.getElementById('missions-container');
        if (cont) cont.innerHTML = data.map(m => `
            <div class="card" style="border-left: 5px solid ${m.status === 'concluida' ? '#00ff00' : (m.status === 'fracassada' ? '#ff4444' : '#333')}">
                <h3>${m.title}</h3>
                <p style="font-size:0.8rem; color:#888;">${m.desc}</p>
                <div style="display:flex; gap:10px; margin-top:10px;">
                    <button onclick="updateMissionStatus('${m.id}', 'concluida')" style="background:#00ff0022; color:#00ff00; border:1px solid #00ff00; padding:5px; flex:1; cursor:pointer;">CONCLUÍDA</button>
                    <button onclick="updateMissionStatus('${m.id}', 'fracassada')" style="background:#ff444422; color:#ff4444; border:1px solid #ff4444; padding:5px; flex:1; cursor:pointer;">FRACASSADA</button>
                    <button onclick="deleteRemote('missions', '${m.id}')" style="background:none; border:none; color:#444; cursor:pointer;">✕</button>
                </div>
            </div>`).join('');
    }

    // Render Financeiro
    if (collection === 'finance') {
        const balanceEl = document.getElementById('total-balance');
        const historyCont = document.getElementById('finance-history');
        const total = data.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        
        if(balanceEl) { 
            balanceEl.innerText = `$ ${total.toLocaleString()}`; 
            balanceEl.style.color = total >= 0 ? "#00ff00" : "#ff4444";
        }
        if(historyCont) historyCont.innerHTML = data.map(f => `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div><h3 style="color:${f.amount >= 0 ? '#00ff00' : '#ff4444'}">${f.amount >= 0 ? '+' : ''}$ ${f.amount.toLocaleString()}</h3><p style="margin:0; font-size:0.8rem; color:#888;">${f.desc}</p></div>
                <button class="btn-delete" onclick="deleteRemote('finance', '${f.id}')">✕</button>
            </div>`).join('');
    }

    // Render Documentos
    if (collection === 'docs') {
        const cont = document.getElementById('docs-container');
        if (cont) cont.innerHTML = data.map(d => `
            <div class="card">
                <h3>${d.title.toUpperCase()}</h3>
                <p style="font-size:0.8rem; color:#888;">${d.desc}</p>
                <button class="btn-delete" style="width:100%; margin-top:10px;" onclick="deleteRemote('docs', '${d.id}')">APAGAR</button>
            </div>`).join('');
    }
}

// ==========================================================================
// 6. FUNÇÕES AUXILIARES
// ==========================================================================

async function updateMissionStatus(id, status) {
    await db.collection('missions').doc(id).update({ status: status });
}

async function deleteRemote(collection, id) {
    if (confirm("Confirmar exclusão definitiva?")) await db.collection(collection).doc(id).delete();
}

function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { 
    document.getElementById(id).classList.remove('active');
    if (id === 'agent-modal') resetAgentForm();
}

function resetAgentForm() {
    editingAgentId = null;
    document.getElementById('a-name').value = '';
    document.getElementById('a-id').value = '';
    document.getElementById('a-image').value = '';
    document.querySelector('#agent-modal h3').innerText = "RECRUTAMENTO DE AGENTE";
    document.querySelectorAll('.course-chip input').forEach(el => el.checked = false);
}