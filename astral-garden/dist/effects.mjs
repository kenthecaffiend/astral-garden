// Surface distance, not center distance, keeps large nearby worlds clear.
export function planetVisibility(distance,radius=0){const t=Math.max(0,Math.min(1,(distance-radius-200)/1100));return 1-t*t*(3-2*t);}
export function cometEnvelope(age,lifetime){if(age<0||age>=lifetime)return 0;return Math.min(1,age/.8,(lifetime-age)/2);}
