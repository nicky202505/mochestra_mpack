import "./Card.css";
import "./WeatherCard.css";

const WEATHER_ICONS = {
  맑음: "☀️",
  흐림: "☁️",
  비: "🌧️",
  눈: "❄️",
};

// 등급별 색 (좋음 → 매우나쁨)
const GRADE_CLASS = {
  좋음: "good",
  보통: "normal",
  나쁨: "bad",
  매우나쁨: "very-bad",
};

function formatDate(date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function DustItem({ label, value, grade }) {
  return (
    <div className="dust-item">
      <span className="dust-label">{label}</span>
      <span className={`dust-grade ${GRADE_CLASS[grade] ?? ""}`}>{grade ?? "-"}</span>
      <span className="dust-value">{value != null ? `${value}㎍/㎥` : "측정 없음"}</span>
    </div>
  );
}

export default function WeatherCard({ weather, status, onClose }) {
  const today = new Date();

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">오늘의 날씨</h2>
        <button className="icon-button" aria-label="설정" type="button">
          ⚙️
        </button>
      </div>

      {status === "loading" ? (
        <div className="weather-display">
          <span className="weather-condition">불러오는 중...</span>
        </div>
      ) : (
        <div className="weather-display">
          <span className="weather-icon">{WEATHER_ICONS[weather.condition] ?? "🌤️"}</span>
          <span className="weather-temp">{weather.temperature}°C</span>
          {weather.minTemp != null && weather.maxTemp != null && (
            <span className="weather-range">
              최저 {Math.round(weather.minTemp)}° / 최고 {Math.round(weather.maxTemp)}°
            </span>
          )}
          <span className="weather-condition">
            📍 {weather.location} · {weather.condition}
          </span>
          {weather.isDefaultLocation && (
            <span className="weather-note">위치 권한이 없어 서울 날씨를 보여줘요</span>
          )}
          {weather.air && (
            <div className="dust">
              <DustItem label="미세먼지" value={weather.air.pm10} grade={weather.air.pm10Grade} />
              <DustItem label="초미세먼지" value={weather.air.pm25} grade={weather.air.pm25Grade} />
            </div>
          )}
        </div>
      )}

      <div className="card-footer">
        {/* <span className="card-label">CARD</span> */}
        <span className="card-date">{formatDate(today)}</span>
        <button className="close-button" aria-label="닫기" onClick={onClose} type="button">
          ✕
        </button>
      </div>
    </div>
  );
}
