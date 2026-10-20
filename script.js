const GEOAPIFY_API_KEY = "37b406e282e34ee4a07d08822f48a83d";
const GEOAPIFY_BASE_URL = "https://api.geoapify.com/v1";

const currentStatus = document.querySelector("#current-status");
const currentDetails = document.querySelector("#current-details");
const addressForm = document.querySelector("#address-form");
const addressInput = document.querySelector("#address");
const addressMessage = document.querySelector("#address-message");
const addressCard = document.querySelector("#address-card");
const addressStatus = document.querySelector("#address-status");
const addressDetails = document.querySelector("#address-details");
const searchButton = document.querySelector("#search-button");

function hasApiKey() {
  return (
    GEOAPIFY_API_KEY !== "YOUR_GEOAPIFY_API_KEY" &&
    GEOAPIFY_API_KEY.trim() !== ""
  );
}

function setDetails(element, timezone) {
  const fields = [
    ["Name of Time Zone", timezone.name],
    ["Latitude", timezone.lat],
    ["Longitude", timezone.lon],
    ["Offset STD", timezone.offset_STD],
    ["Offset STD Seconds", timezone.offset_STD_seconds],
    ["Offset DST", timezone.offset_DST],
    ["Offset DST Seconds", timezone.offset_DST_seconds],
    ["Country", timezone.country || timezone.country_code],
    ["Postcode", timezone.postcode],
    ["City", timezone.city],
  ];

  element.replaceChildren();
  fields
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    )
    .forEach(([label, value]) => {
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = `${label}:`;
      description.textContent = String(value);
      element.append(term, description);
    });
  element.hidden = false;
}

function showError(statusElement, message, detailsElement) {
  statusElement.textContent = message;
  detailsElement.hidden = true;
}

async function getTimezone(latitude, longitude) {
  const params = new URLSearchParams({
    lat: latitude,
    lon: longitude,
    format: "json",
    apiKey: GEOAPIFY_API_KEY,
  });
  const response = await fetch(
    `${GEOAPIFY_BASE_URL}/geocode/reverse?${params}`,
  );
  if (!response.ok) {
    throw new Error(`Timezone request failed (${response.status}).`);
  }
  const data = await response.json();
  const timezone = data.results?.[0]?.timezone;
  if (!timezone) {
    throw new Error("No timezone was found for these coordinates.");
  }
  return { ...timezone, lat: latitude, lon: longitude };
}

async function loadCurrentTimezone() {
  if (!hasApiKey()) {
    showError(
      currentStatus,
      "Add your Geoapify API key in script.js to load timezone data.",
      currentDetails,
    );
    return;
  }

  if (!navigator.geolocation) {
    showError(
      currentStatus,
      "Geolocation is not supported by this browser.",
      currentDetails,
    );
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      try {
        currentStatus.textContent = "Loading your timezone...";
        const timezone = await getTimezone(coords.latitude, coords.longitude);
        currentStatus.textContent = "";
        setDetails(currentDetails, timezone);
      } catch (error) {
        showError(currentStatus, error.message, currentDetails);
      }
    },
    (error) => {
      const message =
        error.code === error.PERMISSION_DENIED
          ? "Location access was denied. Allow location access or search by address below."
          : "Unable to determine your location. Search by address below.";
      showError(currentStatus, message, currentDetails);
    },
    { enableHighAccuracy: false, timeout: 10000 },
  );
}

async function getCoordinates(address) {
  const params = new URLSearchParams({
    text: address,
    format: "json",
    apiKey: GEOAPIFY_API_KEY,
  });
  const response = await fetch(`${GEOAPIFY_BASE_URL}/geocode/search?${params}`);
  if (!response.ok) {
    throw new Error(`Address lookup failed (${response.status}).`);
  }
  const data = await response.json();
  const result = data.results?.[0];
  if (
    !result ||
    typeof result.lat !== "number" ||
    typeof result.lon !== "number"
  ) {
    throw new Error("Address not found. Try adding a city, state, or country.");
  }
  return result;
}

addressForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  addressMessage.textContent = "";
  const address = addressInput.value.trim();

  if (!address) {
    addressMessage.textContent = "Please enter an address.";
    addressInput.focus();
    return;
  }
  if (!hasApiKey()) {
    addressMessage.textContent =
      "Add your Geoapify API key in script.js to search by address.";
    return;
  }

  searchButton.disabled = true;
  addressCard.hidden = false;
  addressStatus.textContent = "Finding the address...";
  addressDetails.hidden = true;

  try {
    const location = await getCoordinates(address);
    addressStatus.textContent = `Timezone for ${location.formatted || address}`;
    const timezone = await getTimezone(location.lat, location.lon);
    setDetails(addressDetails, timezone);
  } catch (error) {
    showError(addressStatus, error.message, addressDetails);
  } finally {
    searchButton.disabled = false;
  }
});

loadCurrentTimezone();
