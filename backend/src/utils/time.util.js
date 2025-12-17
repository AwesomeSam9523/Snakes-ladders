/**
 * Time utility functions
 */

/**
 * Convert seconds to human readable format (HH:MM:SS)
 */
const formatTime = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Convert HH:MM:SS to total seconds
 */
const parseTime = (timeString) => {
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Get current timestamp in seconds
 */
const getCurrentTimestamp = () => {
  return Math.floor(Date.now() / 1000);
};

/**
 * Calculate time difference in seconds
 */
const getTimeDifference = (startTimestamp, endTimestamp) => {
  return endTimestamp - startTimestamp;
};

module.exports = {
  formatTime,
  parseTime,
  getCurrentTimestamp,
  getTimeDifference,
};
