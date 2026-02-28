import * as psychrolib from 'psychrolib';
psychrolib.SetUnitSystem(psychrolib.SI);

export function calculateState(t_db: number, rh: number) {
  const p = 101325;
  const p_ws = psychrolib.GetSatVapPres(t_db);
  const p_w = (rh / 100) * p_ws;
  const w = psychrolib.GetHumRatioFromVapPres(p_w, p) * 1000;
  const h = psychrolib.GetMoistAirEnthalpy(t_db, w / 1000) / 1000;
  return { t_db, rh, w, h };
}