import { useEffect, useState } from "react";
import "./Card.css";
import "./ClockCard.css";

function formatTime(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}: ${m}:${s}`;
}

function formatDate(date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default function ClockCard({ onClose }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Good Morning</h2>
        <button className="icon-button" aria-label="설정" type="button">
          ⚙️
        </button>
      </div>

      <div className="clock-display">{formatTime(now)}</div>

      <div className="card-footer">
        <span className="card-label">CARD</span>
        <span className="card-date">{formatDate(now)}</span>
        <button className="close-button" aria-label="닫기" onClick={onClose} type="button">
          ✕
        </button>
      </div>
    </div>
  );
}
