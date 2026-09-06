// Shared by development and production. No client-supplied tools or storage options.
export const IMAGE_UNAVAILABLE = 'La génération et la modification d’images ne sont pas disponibles sur Woltar Nova. Aether répond uniquement par texte.'

export function isImageRequest(messages) {
  const text = messages.filter((message) => message.role === 'user').at(-1)?.content || ''
  const normalized = text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  return /\b(image|images|photo|photos|portrait|illustration|dessin|avatar|logo|picture)\b/.test(normalized)
    && /\b(gener\w*|cre\w*|dessin\w*|modifi\w*|retouch\w*|fabriqu\w*|fais|faire|genere|create|generate|draw|edit|make)\b/.test(normalized)
}

export function textOnlyRequest({ model, instructions, input }) {
  return {
    model, instructions, input,
    store: false,
    background: false,
    tools: [],
    tool_choice: 'none',
    text: { format: { type: 'text' } },
    reasoning: { effort: 'none' },
    max_output_tokens: 500,
    temperature: 0.7,
  }
}
