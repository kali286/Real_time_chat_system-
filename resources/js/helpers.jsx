export const formatMessageDateLong = (date) => {
  const inputDate = getTanzaniaTime(date);
  const now = getTanzaniaTime(new Date());

  const timeStr = inputDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const shortDateOpts = {
    day: '2-digit',
    month: 'short'
  };

  const fullDateOpts = {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  };

  // If the input is not a valid date, return empty string to avoid 'Invalid Date'
  if (isNaN(inputDate.getTime())) {
    return "";
  }

  if (isToday(inputDate)) {
    return timeStr;
  } else if (isYesterday(inputDate)) {
    return 'Yesterday ' + timeStr;
  } else if (inputDate.getFullYear() === now.getFullYear()) {
    return inputDate.toLocaleDateString('en-US', shortDateOpts) + ' ' + timeStr;
  } else {
    return inputDate.toLocaleDateString('en-US', fullDateOpts) + ' ' + timeStr;
  }
};

export const formatMessageDateshort = (date) => {
  const inputDate = getTanzaniaTime(date);
  const now = getTanzaniaTime(new Date());

  const timeStr = inputDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const shortDateOpts = {
    day: '2-digit',
    month: 'short'
  };

  const fullDateOpts = {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  };

  // Guard against invalid dates
  if (isNaN(inputDate.getTime())) {
    return "";
  }

  if (isToday(inputDate)) {
    return timeStr;
  } else if (isYesterday(inputDate)) {
    return 'Yesterday';
  } else if (inputDate.getFullYear() === now.getFullYear()) {
    return inputDate.toLocaleDateString('en-US', shortDateOpts) + ' ' + timeStr;
  } else {
    return inputDate.toLocaleDateString('en-US', fullDateOpts) + ' ' + timeStr;
  }
};

export const getTanzaniaTime = (date) => {
  // Convert the given date into a Date object representing the
  // wall-clock time in Africa/Dar_es_Salaam (UTC+3). Using
  // toLocaleString with timeZone ensures correct handling across
  // DST/no-DST and avoids manual arithmetic that mixes UTC/getUTC
  // getters later.
  const d = new Date(date);
  try {
    // Create a locale string in the target timezone and parse it back
    // into a Date object. This Date will have the same local fields
    // as the Tanzania wall time.
    const tzString = d.toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam' });
    return new Date(tzString);
  } catch (e) {
    // Fallback: if the environment doesn't support timeZone option,
    // fall back to a fixed offset adjustment of +3 hours.
    const tzOffset = 180; // minutes
    return new Date(d.getTime() + tzOffset * 60000);
  }
};

export const isToday = (d) => {
  const inputDate = getTanzaniaTime(d);
  const now = getTanzaniaTime(new Date());

  // Use local getters (getFullYear/getMonth/getDate) because
  // getTanzaniaTime already returns a Date adjusted to the TZ
  // wall-clock. Mixing UTC getters produced incorrect day math.
  return (
    inputDate.getFullYear() === now.getFullYear() &&
    inputDate.getMonth() === now.getMonth() &&
    inputDate.getDate() === now.getDate()
  );
};

export const isYesterday = (d) => {
  const inputDate = getTanzaniaTime(d);
  const yesterday = getTanzaniaTime(new Date());
  // Use local setter to subtract one day in TZ wall-clock
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    inputDate.getFullYear() === yesterday.getFullYear() &&
    inputDate.getMonth() === yesterday.getMonth() &&
    inputDate.getDate() === yesterday.getDate()
  );
};
