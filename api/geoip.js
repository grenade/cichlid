'use strict';

export const geoip = async (ip) => {
  const response = await fetch(`https://ipapi.co/${ip}/json`);
  const source = await response.json();
};