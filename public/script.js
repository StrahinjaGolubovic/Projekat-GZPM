import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBPC7v0OM0RHOCUfeXedr6R5j6h_9NTxDI",
    authDomain: "gzpm-ff5af.firebaseapp.com",
    projectId: "gzpm-ff5af",
    storageBucket: "gzpm-ff5af.firebasestorage.app",
    messagingSenderId: "112141302390",
    appId: "1:112141302390:web:41aab52df32202a2c73d57",
    measurementId: "G-8MK0EW76EV",
    databaseURL: "https://gzpm-ff5af-default-rtdb.europe-west1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let earningsData = [];
let myChart = null;
let selectedDate = null;

function processTextData() {
    const text = document.getElementById('dataInput').value.trim();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    const newData = [];
    for (let i = 0; i < lines.length; i += 4) {
        if (i + 3 < lines.length) {
            const name = lines[i];
            const dateStr = lines[i + 1];
            const transactionType = lines[i + 2];
            const earningStr = lines[i + 3];
            
            if (transactionType.includes('Zarada')) {
                const earning = parseFloat(earningStr);
                if (!isNaN(earning)) {
                    const timestamp = moment(dateStr, 'MMM Do, YYYY h:mm A').format('YYYY-MM-DD[T]HH:mm:00');
                    const dataEntry = {
                        name: name,
                        timestamp: timestamp,
                        earning: earning
                    };
                    newData.push(dataEntry);
                    
                    const earningsRef = ref(database, 'earnings');
                    push(earningsRef, dataEntry)
                        .then(() => {
                            document.getElementById('dataInput').value = '';
                        })
                        .catch(() => {});
                }
            }
        }
    }

    if (newData.length > 0) {
        earningsData = newData;
        updateChart();
        updateDateSelector();
    }
}

const earningsRef = ref(database, 'earnings');
onValue(earningsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        earningsData = Object.values(data);
        updateChart();
        updateDateSelector();
    }
});

function updateDateSelector() {
    const dateSelector = document.getElementById('dateFilter');
    const dates = [...new Set(earningsData.map(data => moment(data.timestamp).format('YYYY-MM-DD')))];
    dates.sort();
    
    if (dates.length > 0) {
        dateSelector.min = dates[0];
        dateSelector.max = dates[dates.length - 1];
        
        if (!selectedDate) {
            dateSelector.value = dates[0];
            filterByDate(dates[0]);
        }
    }
}

function filterByDate(date) {
    selectedDate = date;
    updateChart();
}

function processDataByMinute(data) {
    const filteredData = selectedDate 
        ? data.filter(entry => moment(entry.timestamp).format('YYYY-MM-DD') === selectedDate)
        : data;

    const minuteMap = {};
    
    filteredData.forEach(entry => {
        const minute = entry.timestamp;
        if (!minuteMap[minute]) {
            minuteMap[minute] = {
                timestamp: minute,
                earning: 0,
                names: []
            };
        }
        minuteMap[minute].earning += entry.earning;
        minuteMap[minute].names.push(entry.name);
    });

    return Object.values(minuteMap)
        .sort((a, b) => moment(a.timestamp).valueOf() - moment(b.timestamp).valueOf());
}

function formatTimestamp(timestamp) {
    return moment(timestamp).format('MMM Do, YYYY h:mm A');
}

function updateChart(sortDirection = 'asc') {
    if (myChart) {
        myChart.destroy();
    }

    const processedData = processDataByMinute(earningsData);
    
    if (sortDirection === 'desc') {
        processedData.reverse();
    }

    const labels = processedData.map(data => {
        const time = formatTimestamp(data.timestamp);
        const names = data.names.join(', ');
        return `${time}\n${names}`;
    });
    const earnings = processedData.map(data => data.earning);

    const ctx = document.getElementById('earningsChart').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Zarada po minuti',
                data: earnings,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Zarada (e)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + 'e';
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Vreme'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: selectedDate ? `GRAFIK ZARADA ZA ${moment(selectedDate).format('DD.MM.YYYY.')}` : 'GRAFIK ZARADA PO MINUTIMA',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const dataIndex = context.dataIndex;
                            const names = processedData[dataIndex].names;
                            const timestamp = formatTimestamp(processedData[dataIndex].timestamp);
                            return [
                                `Vreme: ${timestamp}`,
                                `Zarada: ${context.raw}e`,
                                `Od: ${names.join(', ')}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

function sortData(direction) {
    updateChart(direction);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addEarningsBtn').addEventListener('click', processTextData);
    
    document.getElementById('dateFilter').addEventListener('change', (e) => filterByDate(e.target.value));
    
    document.getElementById('sortAscBtn').addEventListener('click', () => updateChart('asc'));
    document.getElementById('sortDescBtn').addEventListener('click', () => updateChart('desc'));
    
    updateChart();
});

window.handleAddEarnings = processTextData;