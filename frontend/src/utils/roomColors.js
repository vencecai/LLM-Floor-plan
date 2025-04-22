/**
 * Room color mapping for tldraw
 * Using the color names supported by tldraw
 */
export const ROOM_COLORS = {
  // Living spaces
  'Living Room': 'light-blue', 
  'Family Room': 'blue', 
  'Dining Room': 'blue', 
  
  // Bedrooms
  'Master Bedroom': 'violet', 
  'Bedroom': 'light-violet', 
  'Guest Room': 'light-violet', 
  
  // Kitchen and utility
  'Kitchen': 'green', 
  'Pantry': 'light-green', 
  'Laundry': 'light-green', 
  
  // Bathroom
  'Bathroom': 'yellow', 
  'Master Bathroom': 'yellow', 
  'Powder Room': 'yellow', 
  
  // Office and work
  'Office': 'orange', 
  'Study': 'orange', 
  'Library': 'orange', 
  
  // Storage and utility
  'Closet': 'light-violet', 
  'Storage': 'violet', 
  'Utility': 'grey', 
  
  // Entry and circulation
  'Foyer': 'yellow', 
  'Hallway': 'grey', 
  'Corridor': 'grey', 
  
  // Outdoor and transition
  'Porch': 'light-green', 
  'Balcony': 'green', 
  'Deck': 'green', 
  'Garage': 'grey', 
  
  // Default
  'Room': 'white' 
};

/**
 * Get color for a room type, with fallback to default
 * @param {string} roomType - The type of room
 * @returns {string} - tldraw color name
 */
export const getRoomColor = (roomType) => {
  // First, try exact match
  if (ROOM_COLORS[roomType]) {
    return ROOM_COLORS[roomType];
  }
  
  // Try partial match (case insensitive)
  const lowerRoomType = roomType.toLowerCase();
  
  for (const [key, value] of Object.entries(ROOM_COLORS)) {
    if (lowerRoomType.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Return default color
  return ROOM_COLORS.Room;
}; 