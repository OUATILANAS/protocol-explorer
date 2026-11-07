import{workspaceTools}from'./workspace-tools';
import{searchButton}from'./search';
import {config} from '../config';
import {icon,logo} from './icons';
const sep=(extra='')=>`<span class="separator ${extra}" aria-hidden="true"></span>`;
export function topbar(){return `<header class="topbar is-lean">
<button class="btn drawer-btn" data-action="drawer" aria-label="Protocols" aria-controls="protocols" aria-expanded="false">${icon('menu')}<span data-t-label="protocols">Protocols</span></button>
<div class="brand">${logo}<div><h1>PROTOCOL <em>EXPLORER</em></h1><p class="tagline">${config.tagline}</p></div></div>
${sep('brand-separator')}
<div class="now"><span class="label" data-t-label="now">Now learning</span><strong id="now-title"></strong><div class="now-progress"><span id="now-dots"></span><span id="now-status"></span></div></div>
${sep('osi-separator')}
<div class="osi"><div class="osi-title"><span class="label" data-t-label="osi">OSI layer</span><span id="layer-name"></span></div><div class="osi-squares"><i class="osi-marker" aria-hidden="true"></i>${Array.from({length:7},(_,i)=>`<span data-layer="${i+1}">${i+1}</span>`).join('')}</div></div>
<div class="tools">${searchButton()}${workspaceTools()}${sep()}<div class="learning"><div class="learning-title"><span class="label" data-t-label="progress">Learning progress</span><strong id="progress-percent">0%</strong></div><div id="progress-bar" class="progress-bar"></div><span id="progress-text"></span></div>${sep()}
<div class="credit"><span class="label" data-t-label="designed">Designed by</span><a href="${config.creditUrl}" target="_blank" rel="noreferrer"><svg class="credit-x" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M17.75 3h3.07l-6.71 7.67L22 21h-6.18l-4.84-6.33L5.44 21H2.37l7.18-8.2L2 3h6.33l4.38 5.79L17.75 3Zm-1.08 16.18h1.7L7.4 4.73H5.58l11.09 14.45Z"/></svg> ${config.credit}</a></div>${sep()}
<div class="language-wrap"><button class="btn lang-btn" data-action="language" aria-label="Choose language" aria-haspopup="menu" aria-expanded="false">${icon('globe')}<span id="lang-code">EN</span><svg class="icon lang-chevron" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div id="language-menu" hidden></div></div>
<div class="theme-toggle" role="group" aria-label="Theme"><button class="btn icon-btn" data-theme="light" aria-label="Light mode">${icon('sun')}</button><button class="btn icon-btn" data-theme="dark" aria-label="Dark mode">${icon('moon')}</button></div></div></header>`}
