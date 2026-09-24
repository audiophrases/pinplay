// Shared compositor: presets are ordinary part indices, never image overrides.
window.CupAvatar = {
 render(avatar = {}, data = window.CUP_AVATAR) {
  const part = key => data.parts[key][avatar[key] || 0] || data.parts[key][0];
  const head = part('head'), hair = part('hair');
  const body = [part('shirt').svg, head.neck, hair.back, head.ears, head.head, head.cheeks,
   part('eyes').svg, part('mouth').svg, hair.front, part('glasses').svg, part('hat').svg].join('')
   .replace(/#00FFFF/gi,data.skins[avatar.skin||0] || data.skins[0])
   .replace(/#FF00FF/gi,data.hairColors[avatar.hairColor||0] || data.hairColors[0]);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${data.viewBox}">${body}</svg>`;
 }
};
