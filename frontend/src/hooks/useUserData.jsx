const useUserData = () => {
  try {
    const storedData = localStorage.getItem("userData");
    return storedData ? JSON.parse(storedData) : null;
  } catch (error) {
    console.error("Error parsing user data from localStorage:", error);
    return null;
  }
};

const useMeetingData = () => {
  try {
    const storedData = localStorage.getItem("meetingData");
    return storedData ? JSON.parse(storedData) : null;
  } catch (error) {
    console.error("Error parsing meeting data from localStorage:", error);
    return null;
  }
};



export {
  useUserData,
  useMeetingData
}