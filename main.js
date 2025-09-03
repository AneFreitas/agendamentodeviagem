import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// As variáveis globais __app_id, __firebase_config e __initial_auth_token são fornecidas pelo ambiente.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app, auth, db;
let userId = null;

try {
    // Inicializa o Firebase e o Firestore
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // Adiciona um listener para o estado de autenticação
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            console.log('User signed in:', userId);
        } else {
            console.log('No user signed in. Signing in anonymously...');
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Failed to sign in:", error);
            }
        }
    });

} catch (e) {
    console.error("Firebase initialization failed:", e);
}

// Simulação do Backend
// Em um ambiente de produção, esta lógica estaria em um servidor real.
window.fakeBackendApi = {
    calculateDistance: async (startAddress, destination) => {
        // Simulação de cálculo de distância.
        // Em um ambiente real, você usaria uma API de mapas como Google Maps ou OSRM.
        const simulatedDistance = Math.floor(Math.random() * 50) + 5; // Distância entre 5 e 55 km
        return new Promise(resolve => setTimeout(() => resolve(simulatedDistance), 1000));
    },
    saveAppointment: async (appointmentData) => {
        if (!db || !userId) {
            throw new Error("Firestore not initialized or user not authenticated.");
        }
        
        // Firestore Security Rules: write, update: if request.auth.uid == userId
        // Salvando os dados na coleção privada do usuário
        const appointmentsCollection = collection(db, 'artifacts', appId, 'users', userId, 'agendamentos');
        
        try {
            // Serializar o objeto para garantir que o Firestore aceite arrays aninhados, se houver
            const serializedData = JSON.stringify(appointmentData);
            const docRef = await addDoc(appointmentsCollection, { data: serializedData });
            console.log("Document written with ID: ", docRef.id);
            return docRef.id;
        } catch (e) {
            console.error("Error adding document: ", e);
            throw e;
        }
    }
};


const FIXED_FEE = 10.00;
const DRIVER_PHONE_NUMBER = "5511968362035";

const fullNameInput = document.getElementById('fullName');
const cpfInput = document.getElementById('cpf');
const phoneInput = document.getElementById('phone');
const pricePerKmInput = document.getElementById('pricePerKm');
const startAddressInput = document.getElementById('startAddress');
const destinationInput = document.getElementById('destination');
const calculateBtn = document.getElementById('calculateBtn');
const resultsDiv = document.getElementById('results');
const distanceSpan = document.getElementById('distance');
const priceSpan = document.getElementById('price');
const dateInput = document.getElementById('bookingDate');
const timeSelect = document.getElementById('bookingTime');
const bookBtn = document.getElementById('bookBtn');
const messageDiv = document.getElementById('message');
const modal = document.getElementById('modal');
const modalText = document.getElementById('modal-text');
const modalCloseBtn = document.getElementById('modal-close');
const userIdDisplay = document.getElementById('userIdDisplay');

// Mapeamento de userId para o escopo global
// O auth está inicializado no topo do arquivo, o onAuthStateChanged já cuida disso.

function showCustomModal(text) {
    modalText.textContent = text;
    modal.style.display = 'block';
}

modalCloseBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

function validateCPF(cpfStr) {
    const cpf = cpfStr.replace(/[^\d]/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0;
    for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;
    return true;
}

function populateTimeSlots() {
    timeSelect.innerHTML = '';
    for (let hour = 8.5; hour <= 16; hour += 0.5) {
        const h = Math.floor(hour);
        const m = (hour % 1) * 60;
        const timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const option = new Option(timeString, timeString);
        timeSelect.add(option);
    }
}

function setupDatePicker() {
    dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);
}

function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = 'text-center font-medium p-3 rounded-lg';
    if (type === 'success') {
        messageDiv.classList.add('bg-green-100', 'text-green-800');
    } else {
        messageDiv.classList.add('bg-red-100', 'text-red-800');
    }
    messageDiv.classList.remove('hidden');
    setTimeout(() => { messageDiv.classList.add('hidden'); }, 5000);
}

function validateUserData() {
    if (!fullNameInput.value.trim()) {
        showCustomModal("Por favor, informe seu nome completo.");
        return false;
    }
    if (!validateCPF(cpfInput.value)) {
        showCustomModal("O CPF digitado é inválido. Por favor, verifique.");
        return false;
    }
    if (phoneInput.value.length < 15) {
        showCustomModal("Por favor, informe um telefone válido.");
        return false;
    }
    return true;
}

calculateBtn.addEventListener('click', async () => {
    if (!validateUserData()) return;

    const startAddress = startAddressInput.value.trim();
    const destination = destinationInput.value.trim();
    const pricePerKm = parseFloat(pricePerKmInput.value);

    if (!startAddress || !destination) {
        showCustomModal("Por favor, informe os endereços de partida e destino.");
        return;
    }

    if (isNaN(pricePerKm) || pricePerKm <= 0) {
        showCustomModal("Por favor, insira um valor por KM válido.");
        return;
    }
    
    resultsDiv.classList.add('hidden');
    messageDiv.classList.add('hidden');
    calculateBtn.disabled = true;
    calculateBtn.textContent = 'Calculando...';

    try {
        // Chama a função simulada de backend para cálculo
        const distance = await window.fakeBackendApi.calculateDistance(startAddress, destination);
        const price = (distance * pricePerKm) + FIXED_FEE;
        distanceSpan.textContent = `${distance.toFixed(1)} km`;
        priceSpan.textContent = `R$ ${price.toFixed(2).replace('.', ',')}`;
        resultsDiv.classList.remove('hidden');
    } catch (error) {
        showCustomModal(`Erro ao calcular a viagem: ${error.message}`);
    } finally {
        calculateBtn.disabled = false;
        calculateBtn.textContent = 'Consultar Valor e Disponibilidade';
    }
});

bookBtn.addEventListener('click', async () => {
    if (!validateUserData()) return;
    if (resultsDiv.classList.contains('hidden')) {
        showCustomModal("Por favor, consulte o valor antes de agendar.");
        return;
    }

    const selectedDate = dateInput.value;
    if (!selectedDate) {
        showCustomModal("Por favor, selecione uma data para a viagem.");
        return;
    }

    const dateObj = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();

    if (dayOfWeek === 6 || dayOfWeek === 0) {
         showCustomModal("Agendamentos não disponíveis aos sábados e domingos.");
         return;
    }

    const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    const appointmentData = {
        fullName: fullNameInput.value,
        cpf: cpfInput.value,
        phone: phoneInput.value,
        startAddress: startAddressInput.value,
        destination: destinationInput.value,
        date: formattedDate,
        time: timeSelect.value,
        estimatedPrice: priceSpan.textContent,
        userId: userId // Adiciona o ID do usuário aos dados salvos
    };

    bookBtn.disabled = true;
    bookBtn.textContent = 'Agendando...';

    try {
        const appointmentId = await window.fakeBackendApi.saveAppointment(appointmentData);

        const messageParts = [
            "Olá, Leticia! Gostaria de agendar uma viagem.",
            "",
            `*ID do Agendamento:* ${appointmentId}`,
            "",
            "*Dados da Cliente:*",
            `*Nome:* ${fullNameInput.value}`,
            `*Telefone:* ${phoneInput.value}`,
            "",
            "*Detalhes da Viagem:*",
            `*Partida:* ${startAddressInput.value}`,
            `*Destino:* ${destinationInput.value}`,
            `*Data:* ${formattedDate}`,
            `*Horário:* ${timeSelect.value}`,
            `*Valor Estimado:* ${priceSpan.textContent}`
        ];
        
        const messageText = encodeURIComponent(messageParts.join('\n'));
        const whatsappUrl = `https://wa.me/${DRIVER_PHONE_NUMBER}?text=${messageText}`;
        
        window.open(whatsappUrl, '_blank');
        showMessage("Agendamento salvo com sucesso e mensagem do WhatsApp preparada!", 'success');
    } catch (error) {
        showCustomModal(`Erro ao salvar o agendamento: ${error.message}`);
    } finally {
        bookBtn.disabled = false;
        bookBtn.textContent = 'Confirmar via WhatsApp';
    }
});

// Máscaras de input
cpfInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/[^\d]/g, '');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    e.target.value = value;
});

phoneInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/[^\d]/g, '');
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    e.target.value = value;
});

document.addEventListener('DOMContentLoaded', () => {
    populateTimeSlots();
    setupDatePicker();
});
