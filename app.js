// app.js

document.addEventListener('DOMContentLoaded', () => {
    initDate();
    initPrayer();
    fetchRates(); // The complex part
    initWeather();
    initHadith();
    loadNotes();
    loadNews();

    // Drag & Drop
    Sortable.create(document.getElementById('grid-container'), {
        animation: 150,
        ghostClass: 'opacity-50',
        delay: 150, 
        delayOnTouchOnly: true
    });

    // Toggle Expansion
    document.querySelectorAll('.widget').forEach(w => {
        w.addEventListener('click', (e) => {
            if(e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            document.querySelectorAll('.widget.expanded').forEach(x => { if(x !== w) x.classList.remove('expanded'); });
            w.classList.toggle('expanded');
        });
    });
});

// --- 1. SARAFI.AF SCRAPER (Via Proxy) ---
async function fetchRates() {
    const list = document.getElementById('rates-list');
    const mainPrice = document.getElementById('usd-rate');
    
    // Fallback data if offline or CORS fails
    const fallbackData = { USD: '71.20', EUR: '76.50', GBP: '89.10', IRR: '1.40', PKR: '0.25' };

    try {
        // Using AllOrigins Proxy to bypass CORS on sarafi.af
        const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent('https://sarafi.af/fa/exchange-rates/sarai-shahzada');
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        if (data.contents) {
            // Parse HTML string to DOM
            const parser = new DOMParser();
            const doc = parser.parseFromString(data.contents, 'text/html');
            
            // Logic to find rates in their table structure (Scanning table rows)
            // Note: This selector depends on their current HTML structure
            const rows = doc.querySelectorAll('table tr'); 
            const rates = {};

            rows.forEach(row => {
                const text = row.innerText;
                if(text.includes('دالر') && !rates.USD) rates.USD = extractPrice(row);
                if(text.includes('یورو') && !rates.EUR) rates.EUR = extractPrice(row);
                if(text.includes('پوند') && !rates.GBP) rates.GBP = extractPrice(row);
                if(text.includes('تومان') && !rates.IRR) rates.IRR = extractPrice(row);
                if(text.includes('کلدار') && !rates.PKR) rates.PKR = extractPrice(row);
            });

            updateRatesUI(rates.USD ? rates : fallbackData);
        } else {
            throw new Error("No content");
        }
    } catch (e) {
        console.log('Using Offline Rates');
        updateRatesUI(fallbackData);
    }
}

function extractPrice(rowElement) {
    // Finds the sell price in the row cells
    const cells = rowElement.querySelectorAll('td');
    if(cells.length > 2) return cells[2].innerText.trim(); // Usually 3rd column is Sell
    return '---';
}

function updateRatesUI(rates) {
    const list = document.getElementById('rates-list');
    document.getElementById('usd-rate').innerText = rates.USD;
    window.currentUsdRate = parseFloat(rates.USD); // Save for converter

    list.innerHTML = `
        ${rateRow('🇺🇸 دالر', rates.USD)}
        ${rateRow('🇪🇺 یورو', rates.EUR)}
        ${rateRow('🇬🇧 پوند', rates.GBP)}
        ${rateRow('🇮🇷 تومان', rates.IRR)}
        ${rateRow('🇵🇰 کلدار', rates.PKR)}
    `;
}

function rateRow(name, price) {
    return `<div class="flex justify-between items-center bg-gray-50 dark:bg-slate-700 p-2 rounded">
        <span>${name}</span><span class="font-bold font-mono">${price}</span>
    </div>`;
}

function convertCurrency() {
    const val = parseFloat(document.getElementById('convAmount').value);
    const rate = window.currentUsdRate || 71;
    if(!isNaN(val)) {
        document.getElementById('convResult').innerText = (val * rate).toFixed(2);
    }
}

// --- 2. PRAYER (Sunni/Hanafi) ---
function initPrayer() {
    const coords = new adhan.Coordinates(34.5553, 69.2075); // Kabul
    const params = adhan.CalculationMethod.Karachi();
    params.madhab = adhan.Madhab.Hanafi;
    const times = new adhan.PrayerTimes(coords, new Date(), params);
    
    const map = { fajr:'صبح', sunrise:'طلوع', dhuhr:'پیشین', asr:'دیگر', maghrib:'شام', isha:'خفتن' };
    const list = document.getElementById('prayer-list');
    const now = new Date();
    let next = null;

    ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(p => {
        const time = times[p];
        const timeStr = moment(time).format('HH:mm');
        list.innerHTML += `<li class="flex justify-between border-b dark:border-slate-700 pb-1"><span>${map[p]}</span><b>${timeStr}</b></li>`;
        
        if(!next && time > now) next = { n: map[p], t: timeStr };
    });

    if(next) {
        document.getElementById('next-p-name').innerText = next.n;
        document.getElementById('next-p-time').innerText = next.t;
    }
}

// --- 3. WEATHER & DATE ---
async function initWeather() {
    try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=34.52&longitude=69.17&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto');
        const data = await res.json();
        document.getElementById('weather-temp').innerText = Math.round(data.current_weather.temperature) + '°';
        document.getElementById('w-wind').innerText = data.current_weather.windspeed + ' km';
        document.getElementById('w-hum').innerText = '40%'; 

        const flist = document.getElementById('forecast-list');
        for(let i=1; i<=3; i++) {
            flist.innerHTML += `<div class="flex justify-between text-xs py-1"><span>${moment().add(i,'days').format('jdddd')}</span><span>${Math.round(data.daily.temperature_2m_max[i])}° / ${Math.round(data.daily.temperature_2m_min[i])}°</span></div>`;
        }
    } catch(e){}
}

function initDate() {
    moment.loadPersian({usePersianDigits: true});
    document.getElementById('currentDate').innerText = moment().format('jD jMMMM jYYYY');
}

// --- 4. HADITH & NEWS (Mock/Static for speed) ---
function initHadith() {
    const h = [
        {ar: "مَن صَمَتَ نَجا", fa: "هر که سکوت کرد، نجات یافت."},
        {ar: "خیرکم من تعلم القرآن وعلمه", fa: "بهترین شما کسی است که قرآن بیاموزد و یاد دهد."}
    ];
    const i = Math.floor(Math.random() * h.length);
    document.getElementById('hadith-ar').innerText = h[i].ar;
    document.getElementById('hadith-fa').innerText = h[i].fa;
}

function loadNews() {
    // Simulating News (Real API requires server key)
    const news = [
        { title: "آغاز کار پروژه سرک کابل-قندهار", time: "۱ ساعت پیش" },
        { title: "کاهش بهای مواد نفتی در بازار", time: "۳ ساعت پیش" },
        { title: "مسابقات کریکت: افغانستان برنده شد", time: "۵ ساعت پیش" }
    ];
    document.getElementById('news-title').innerText = news[0].title;
    const list = document.getElementById('news-list');
    news.forEach(n => {
        list.innerHTML += `<div class="flex items-center gap-2 border-b dark:border-slate-700 pb-2"><img src="https://via.placeholder.com/40" class="rounded"><div class="text-xs"><p class="font-bold">${n.title}</p><span class="text-gray-400">${n.time}</span></div></div>`;
    });
}

// --- 5. NOTES ---
function loadNotes() {
    const n = localStorage.getItem('userNote');
    if(n) {
        document.getElementById('user-note').value = n;
        document.getElementById('note-preview').innerText = n.substring(0, 15) + '...';
    }
}
function saveNote() {
    const val = document.getElementById('user-note').value;
    localStorage.setItem('userNote', val);
    document.getElementById('note-preview').innerText = val.substring(0, 15) + '...';
    alert('یادداشت ذخیره شد');
}