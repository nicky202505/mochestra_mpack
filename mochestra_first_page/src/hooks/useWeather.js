import { useEffect, useState } from "react";
import { fetchTodayWeather } from "../api/kweather";

const MOCK_WEATHER = {
  location: "서울특별시",
  temperature: 12,
  condition: "맑음",
};

const SEOUL_COORDS = { lat: 37.5665, lon: 126.978 };

export function useWeather() {
  const [weather, setWeather] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  useEffect(() => {
    let cancelled = false;

    fetchTodayWeather(SEOUL_COORDS)
      .then((data) => {
        if (cancelled) return;
        setWeather(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("케이웨더 API 연동 실패, 목업 데이터로 대체:", err.message);
        setWeather(MOCK_WEATHER);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { weather, status };
}
