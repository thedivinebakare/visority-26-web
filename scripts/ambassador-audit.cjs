const fs=require('node:fs');
const skill=fs.readFileSync('C:/Users/NexusPC/.agents/skills/design-taste-frontend/SKILL.md','utf8');
for(const heading of ['## 11.','## 12.','## 13.']){const i=skill.indexOf(heading);if(i>=0)console.log(skill.slice(i,Math.min(skill.length,i+7000)));}
const css=fs.readFileSync('assets/css/premium.css','utf8');console.log(css.slice(css.indexOf('.ambassador-hub')));
