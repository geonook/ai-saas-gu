export interface Character {
  id: string
  name: string
  imageUrl: string
  description?: string
}

export interface CharacterSelectionModalProps {
  characters: Character[]
  isLoading: boolean
  onSelect: (character: Character) => void
  onCancel: () => void
}

export interface CharacterCardProps {
  character: Character
  isSelected: boolean
  onSelect: (character: Character) => void
}