import "./Card.css";
import "./WeatherCard.css";
import { useWeather } from "../hooks/useWeather";

const WEATHER_ICONS = {
  맑음: "☀️",
  흐림: "☁️",
  비: "🌧️",
  눈: "❄️",
};

function formatDate(date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default function WeatherCard({ onClose }) {
  const { weather, status } = useWeather();
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
          <span className="weather-condition">
            {weather.location} · {weather.condition}
          </span>
        </div>
      )}

      <div className="card-footer">
        <span className="card-label">CARD</span>
        <span className="card-date">{formatDate(today)}</span>
        <button className="close-button" aria-label="닫기" onClick={onClose} type="button">
          ✕
        </button>
      </div>
    </div>
  );
}
