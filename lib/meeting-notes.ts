// Preserve source language, speaker assignments, figures and dates.
export function noteBlocks(value:string) {
  return value.split(/\r?\n/).map(raw=>{
    const trimmed=raw.trim();
    const heading=/^#{1,6}\s/.test(trimmed)||/^\*\*[^*]+\*\*:?$/.test(trimmed)||/:$/.test(trimmed);
    const bullet=/^\s*(?:[-*•]|\d+[.)])\s+/.test(raw);
    let text=trimmed.replace(/^#{1,6}\s+|^(?:[-*•]|\d+[.)])\s+/,'')
      .replace(/\*\*|__/g,'').replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g,'$1').trim();
    if(!heading && /[\p{L}\p{N}]$/u.test(text) && text.split(/\s+/).length>=4)text+='.';
    return {text,heading,bullet};
  }).filter(block=>block.text);
}

export function structuredNotes(value:string){
  return noteBlocks(value).map(block=>block.heading?'\n**'+block.text+'**':(block.bullet?'•  ':'')+block.text).join('\n').trim();
}

// Keep an explicitly named topic with its supporting paragraphs.
export function strategicNotes(value:string){
  const groups={findings:[] as string[], risks:[] as string[], goals:[] as string[], next:[] as string[]};
  let target=groups.findings;
  for(const raw of value.split('\n')){
    const [block]=noteBlocks(raw);
    if(!block)continue;
    const heading=block.heading || /^\s*\*\*[^*]+:\*\*/.test(raw);
    if(heading){
      const label=block.text.split(':')[0].toLowerCase();
      target=/\b(risks?|opportunities|swot|riesgos?|oportunidades?|riscos?)\b/.test(label)?groups.risks
        :/\b(goals?|targets?|milestones?|metas?|objetivos?)\b/.test(label)?groups.goals
        :/next session|next meeting|próxima sess|próxima reuni/.test(label)?groups.next:groups.findings;
    }
    target.push(raw);
  }
  return groups;
}
