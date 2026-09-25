import { useEffect, useState } from "react";
import { fetchTodayWeather } from "../api/kma";
import { fetchAirQuality } from "../api/airkorea";
import { DEFAULT_LOCATION, getLocation } from "../api/location";

const MOCK_WEATHER = {
  location: DEFAULT_LOCATION.locationName,
  temperature: 12,
  condition: "맑음",
  humidity: 50,
  windSpeed: 2,
  feelsLike: 12,
  minTemp: 7,
  maxTemp: 19,
};

export function useWeather() {
  const [weather, setWeather] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const location = await getLocation();

      // 미세먼지는 부가 정보라 실패해도 날씨는 그대로 보여줌
      const [weatherResult, airResult] = await Promise.allSettled([
        fetchTodayWeather(location),
        fetchAirQuality(location),
      ]);
      if (cancelled) return;

      if (airResult.status === "rejected") {
        console.warn("에어코리아 API 연동 실패:", airResult.reason.message);
      }
      const air = airResult.status === "fulfilled" ? airResult.value : null;

      if (weatherResult.status === "fulfilled") {
        setWeather({ ...weatherResult.value, air, isDefaultLocation: location.isDefault });
        setStatus("ready");
      } else {
        console.warn("기상청 API 연동 실패, 목업 데이터로 대체:", weatherResult.reason.message);
        setWeather({ ...MOCK_WEATHER, location: location.locationName, air });
        setStatus("error");
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { weather, status };
}
