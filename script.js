const ddlUnits = document.querySelector("#ddlUnits");
const ddlDay = document.querySelector("#ddlDay");
const txtSearch = document.querySelector("#txtSearch");
const btnSearch = document.querySelector("#btnSearch");
const dvCityCountry = document.querySelector("#dvCityCountry");
const dvCurrDate = document.querySelector("#dvCurrDate");
const dvCurrTemp = document.querySelector("#dvCurrTemp");
const pFeelsLike = document.querySelector("#pFeelsLike");
const pHumidity = document.querySelector("#pHumidity");
const pWind = document.querySelector("#pWind");
const pPrecipitation = document.querySelector("#pPrecipitation");

let cityName, countryName, weatherData;

async function getGeoData() {
    let search = txtSearch.value;
    if (!search) {
        alert("Please enter a location to search.");
        return;
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${search}&format=jsonv2&addressdetails=1`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        const result = await response.json();
        if (result.length === 0) {
            alert("Location not found. Please try again.");
            return;
        }

        const lat = result[0].lat;
        const lon = result[0].lon;
        
        // --- This is the part that fixes the error ---
        // It pulls the text for the city and country out of the result object.
        const city = result[0].address.city || result[0].address.town || result[0].address.village;
        const country = result[0].address.country_code.toUpperCase();

        // Now it correctly calls the functions with simple text
        loadLocationData(city, country);
        getWeatherData(lat, lon);

    } catch (error) {
        console.error(error.message);
    }
}

// Function to get user's location on page load
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                getWeatherData(lat, lon);
                reverseGeocode(lat, lon);
            },
            (error) => {
                // If user denies, default to a search for "London"
                console.error("Geolocation error:", error.message);
                txtSearch.value = "London";
                getGeoData();
            }
        );
    } else {
        // If browser doesn't support, default to London
        console.error("Geolocation is not supported by this browser.");
        txtSearch.value = "London";
        getGeoData();
    }
}

// Function to get city name from coordinates
async function reverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        const result = await response.json();
        const city = result.address.city || result.address.town || result.address.village;
        const country = result.address.country_code.toUpperCase();
        loadLocationData(city, country); // Uses the modified function below
    } catch (error) {
        console.error(error.message);
        dvCityCountry.textContent = "Location not found";
    }
}

function loadLocationData(city, country) {
    let dateOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
        weekday: "long",
    };
    let currDate = new Intl.DateTimeFormat("en-US", dateOptions).format(new Date());

    dvCityCountry.textContent = `${city}, ${country}`;
    dvCurrDate.textContent = currDate;
}

async function getWeatherData(lat, lon) {
  let tempUnit = "celsius";
  let windUnit = "kmh";
  let precipUnit = "mm";

  // if toggle value = F
  if (ddlUnits.value === "F") {
    tempUnit = "fahrenheit";
    windUnit = "mph";
    precipUnit = "inch";
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,weather_code&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m&wind_speed_unit=${windUnit}&temperature_unit=${tempUnit}&precipitation_unit=${precipUnit}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    weatherData = await response.json();
    console.log(weatherData);

    loadCurrentWeather(weatherData);
    loadDailyForecast(weatherData);
    loadHourlyForecast(weatherData);
  } catch (error) {
    console.error(error.message);
  }
}

function loadCurrentWeather() {
  dvCurrTemp.textContent = Math.round(weatherData.current.temperature_2m);
  pFeelsLike.textContent = Math.round(weatherData.current.apparent_temperature);
  pHumidity.textContent = weatherData.current.relative_humidity_2m;
  pWind.textContent = `${weatherData.current.wind_speed_10m} ${weatherData.current_units.wind_speed_10m.replace("mp/h", "mph")}`;
  pPrecipitation.textContent = `${weatherData.current.precipitation} ${weatherData.current_units.precipitation.replace("inch", "in")}`;
}

function loadDailyForecast() {
  let daily = weatherData.daily;

  for (let i = 0; i < 7; i++) {
    let date = new Date(daily.time[i]);
    let dayOfWeek = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
    let dvForecastDay = document.querySelector(`#dvForecastDay${i + 1}`);
    let weatherCodeName = getWeatherCodeName(daily.weather_code[i]);
    let dailyHigh = Math.round(daily.temperature_2m_max[i]) + "°";
    let dailyLow = Math.round(daily.temperature_2m_min[i]) + "°";

    while (dvForecastDay.firstChild) {
      dvForecastDay.removeChild(dvForecastDay.firstChild);
    }

    addDailyElement("p", "daily__day-title", dayOfWeek, "", dvForecastDay, "afterbegin");
    addDailyElement("img", "daily__day-icon", "", weatherCodeName, dvForecastDay, "beforeend");
    addDailyElement("div", "daily__day-temps", "", "", dvForecastDay, "beforeend");

    let dvDailyTemps = document.querySelector(`#dvForecastDay${i + 1} .daily__day-temps`);
    addDailyElement("p", "daily__day-high", dailyHigh, "", dvDailyTemps, "afterbegin");
    addDailyElement("p", "daily__day-low", dailyLow, "", dvDailyTemps, "beforeend");
  }
}

function addDailyElement(tag, className, content, weatherCodeName, parentElement, position) {
  const newElement = document.createElement(tag);
  newElement.setAttribute("class", className);
  if (content !== "") {
    const newContent = document.createTextNode(content);
    newElement.appendChild(newContent);
  }
  if (tag === "img") {
    newElement.setAttribute("src", `assets/images/icon-${weatherCodeName}.webp`);
    newElement.setAttribute("alt", weatherCodeName);
    newElement.setAttribute("width", "320");
    newElement.setAttribute("height", "320");
  }
  parentElement.insertAdjacentElement(position, newElement);
}

function addHourlyElement(tag, className, content, weatherCodeName, parentElement, position) {
  const newElement = document.createElement(tag);
  newElement.setAttribute("class", className);
  if (content !== "") {
    const newContent = document.createTextNode(content);
    newElement.appendChild(newContent);
  }
  if (tag === "img") {
    newElement.setAttribute("src", `assets/images/icon-${weatherCodeName}.webp`);
    newElement.setAttribute("alt", weatherCodeName);
    newElement.setAttribute("width", "320");
    newElement.setAttribute("height", "320");
  }
  parentElement.insertAdjacentElement(position, newElement);
}

function loadHourlyForecast() {
  console.log("loadHourlyForecast()");
  let dayIndex = parseInt(ddlDay.value, 10);

  console.log(`Day ${dayIndex + 1}`);
  let firstHour = 24 * dayIndex;
  let lastHour = 24 * (dayIndex + 1) - 1;
  let weatherCodes = weatherData.hourly.weather_code;
  let temps = weatherData.hourly.temperature_2m;
  let hours = weatherData.hourly.time;
  let id = 1;

  for (let h = firstHour; h <= lastHour; h++) {
    // console.log(`hour = ${h}`);
    let weatherCodeName = getWeatherCodeName(weatherCodes[h]);
    let temp = Math.round(temps[h]) + "°";
    let hour = new Date(hours[h]).toLocaleString("en-US", { hour: "numeric", hour12: true });
    let dvForecastHour = document.querySelector(`#dvForecastHour${id}`);

    while (dvForecastHour.firstChild) {
      dvForecastHour.removeChild(dvForecastHour.firstChild);
    }

    // console.log(hour, weatherCodeName, temp);

    // console.log(`#dvForecastHour${id}`);
    addDailyElement("img", "hourly__hour-icon", "", weatherCodeName, dvForecastHour, "afterbegin");
    addDailyElement("p", "hourly__hour-time", hour, "", dvForecastHour, "beforeend");
    addDailyElement("p", "hourly__hour-temp", temp, "", dvForecastHour, "beforeend");

    id++;
  }
}

function getHours() {
  for (let h = 0; h <= 23; h++) {
    console.log(h);
  }
}

function getWeatherCodeName(code) {
  const weatherCodes = {
    0: "sunny",
    1: "partly-cloudy",
    2: "partly-cloudy",
    3: "overcast",
    45: "fog",
    48: "fog",
    51: "drizzle",
    53: "drizzle",
    55: "drizzle",
    56: "drizzle",
    57: "drizzle",
    61: "rain",
    63: "rain",
    65: "rain",
    66: "rain",
    67: "rain",
    80: "rain",
    81: "rain",
    82: "rain",
    71: "snow",
    73: "snow",
    75: "snow",
    77: "snow",
    85: "snow",
    86: "snow",
    95: "storm",
    96: "storm",
    99: "storm",
  };

  return weatherCodes[code];
}

function populateDayOfWeek() {
  let currDate = new Date();
  let currDay;

  for (i = 0; i < 7; i++) {
    currDay = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(currDate);
    const newOption = document.createElement("option");
    const dayOfWeek = document.createTextNode(currDay);

    newOption.setAttribute("class", "hourly__select-day");
    newOption.setAttribute("value", i);
    newOption.appendChild(dayOfWeek);

    ddlDay.insertAdjacentElement("beforeend", newOption);

    currDate.setDate(currDate.getDate() + 1);
  }

  console.log(ddlDay);
}

function handleSearchEnter(e){
  if (e.keyCode === 13 || e.key === 'Enter'){
    e.preventDefault();
    getGeoData();
  }
}

populateDayOfWeek();
getGeoData();
getUserLocation();

btnSearch.addEventListener("click", getGeoData);
ddlUnits.addEventListener("change", getGeoData);
ddlDay.addEventListener("change", loadHourlyForecast);
txtSearch.addEventListener("keydown", handleSearchEnter);
