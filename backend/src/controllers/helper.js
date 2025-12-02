const formatMsToHMS_String = (totalMs, hms_string) => {
  // Ensure the input is a positive number
  if (totalMs < 0) {
    totalMs = Math.abs(totalMs);
  }
let hours = Math.floor((totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
let minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
let seconds = Math.floor((totalMs % (1000 * 60)) / 1000);
hms_string =  hours + " : " + minutes + " : " + seconds + " s";
return hms_string;
}

export {
    formatMsToHMS_String
}