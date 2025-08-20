// --- ESTADO GLOBAL Y CONFIGURACIÓN ---
// Aseguramos que 'state' se declare una sola vez.
let state = {
    bcv: { rate: 0, currentInput: "0", isFromUSD: true },
    custom: { rate: 0, currentInput: "0", isFromUSD: true },
    general: { currentInput: "0", previousInput: "", operation: null }
};
let currentMode = 'bcv';

// --- FUNCIÓN MEJORADA PARA OBTENER LA TASA DEL BCV ---
async function fetchBCVRate() {
    const bcvRateDisplay = document.getElementById('bcv-rate-display');
    bcvRateDisplay.innerText = "cargando...";

    const bcvUrl = 'https://www.bcv.org.ve/';
    // CAMBIO CLAVE: Usamos un proxy diferente y más permisivo.
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(bcvUrl)}`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        console.log("Iniciando fetch a través del nuevo proxy: corsproxy.io");
        const response = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Respuesta del proxy no fue OK. Estatus: ${response.status}`);
        }

        console.log("Proxy respondió OK. Procesando HTML...");
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const dolarDiv = doc.querySelector('#dolar strong');
        if (!dolarDiv) {
            throw new Error("No se encontró el elemento '#dolar strong' en el HTML.");
        }
        
        const rateStr = dolarDiv.textContent.trim();
        const rateNum = parseFloat(rateStr.replace(',', '.'));

        if (isNaN(rateNum)) {
            throw new Error(`El texto '${rateStr}' no se pudo convertir a número.`);
        }
        
        console.log(`Tasa obtenida exitosamente: ${rateNum}`);
        state.bcv.rate = rateNum;
        bcvRateDisplay.innerText = state.bcv.rate.toFixed(2).replace('.', ',');
        updateDisplay('bcv');

    } catch (error) {
        console.error("Error detallado al obtener la tasa del BCV:", error);
        bcvRateDisplay.innerText = "Error";
        state.bcv.rate = 0;
    }
}

// --- INICIALIZACIÓN ---
window.onload = function() {
    try { Telegram.WebApp.ready(); } catch (e) { console.log("Modo de prueba local."); }
    fetchBCVRate();
    updateDisplay('custom');
    updateDisplay('general');
};

// --- El resto del script.js (las funciones de la calculadora) permanece igual ---
function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`${mode}-mode`).classList.add('active');
    document.querySelectorAll('.tab-button').forEach(el => el.classList.remove('active'));
    document.getElementById(`btn-${mode}`).classList.add('active');
}
function appendNumber(number, mode) {
    if (state[mode].currentInput === "0" && number !== '00') {
        state[mode].currentInput = number;
    } else if (state[mode].currentInput !== "0" || (state[mode].currentInput === "0" && number === '00') ) {
         if(state[mode].currentInput.length < 15) state[mode].currentInput += number;
    }
    updateDisplay(mode);
}
function appendDecimal(mode) {
    if (!state[mode].currentInput.includes(',')) {
        state[mode].currentInput += ',';
    }
    updateDisplay(mode);
}
function deleteLast(mode) {
    state[mode].currentInput = state[mode].currentInput.slice(0, -1);
    if (state[mode].currentInput === "") state[mode].currentInput = "0";
    updateDisplay(mode);
}
function clearAll(mode) {
    state[mode].currentInput = "0";
    if (mode === 'general') {
        state.general.previousInput = "";
        state.general.operation = null;
    }
    updateDisplay(mode);
}
function updateDisplay(mode) {
    if (mode === 'bcv' || mode === 'custom') {
        const fromSymbol = document.getElementById(`${mode}-from-symbol`);
        const toSymbol = document.getElementById(`${mode}-to-symbol`);
        const mainDisplay = document.getElementById(`${mode}-main-display`);
        const subDisplay = document.getElementById(`${mode}-sub-display`);
        if (mode === 'custom') {
            state.custom.rate = parseFloat(document.getElementById('custom-rate-input').value.replace(',', '.')) || 0;
        }
        const currentRate = state[mode].rate;
        if (currentRate === 0 && mode ==='bcv') return;
        const mainValue = parseFloat(state[mode].currentInput.replace(',', '.')) || 0;
        let subValue = 0;
        if (state[mode].isFromUSD) {
            subValue = mainValue * currentRate;
            fromSymbol.innerText = "$"; toSymbol.innerText = "Bs";
        } else {
            subValue = mainValue / currentRate;
            fromSymbol.innerText = "Bs"; toSymbol.innerText = "$";
        }
        mainDisplay.innerText = state[mode].currentInput;
        subDisplay.innerText = subValue.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (mode === 'general') {
        document.getElementById('general-main-display').innerText = state.general.currentInput;
        if(state.general.operation != null) {
            document.getElementById('general-sub-display').innerText = `${state.general.previousInput} ${state.general.operation}`;
        } else {
            document.getElementById('general-sub-display').innerText = '';
        }
    }
}
function swapCurrencies(mode) {
    state[mode].isFromUSD = !state[mode].isFromUSD;
    const subDisplayText = document.getElementById(`${mode}-sub-display`).innerText;
    const subValue = parseFloat(subDisplayText.replace(/\./g, '').replace(',', '.'));
    state[mode].currentInput = subValue.toLocaleString('es-VE', { useGrouping: false, minimumFractionDigits: 2 }).replace('.', ',');
    updateDisplay(mode);
}
function chooseOperation(op) {
    if(state.general.currentInput === '0') return;
    if(state.general.previousInput !== '') {
        calculate();
    }
    state.general.operation = op;
    state.general.previousInput = state.general.currentInput;
    state.general.currentInput = '0';
    updateDisplay('general');
}
function calculate() {
    let result;
    const prev = parseFloat(state.general.previousInput.replace(',', '.'));
    const current = parseFloat(state.general.currentInput.replace(',', '.'));
    if(isNaN(prev) || isNaN(current)) return;
    switch(state.general.operation) {
        case '+': result = prev + current; break;
        case '-': result = prev - current; break;
        case '×': result = prev * current; break;
        case '÷': result = prev / current; break;
        case '^': result = Math.pow(prev, current); break;
        case '%': result = (prev / 100) * current; break;
        default: return;
    }
    state.general.currentInput = result.toLocaleString('es-VE', { useGrouping: false }).replace('.', ',');
    state.general.operation = null;
    state.general.previousInput = '';
    updateDisplay('general');
}