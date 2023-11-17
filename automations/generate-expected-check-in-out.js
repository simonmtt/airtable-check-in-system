function getWeekDay(dateString) {
    const daysOfWeek = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const date = new Date(dateString);
    const dayOfWeekIndex = date.getDay();
    const dayOfWeek = daysOfWeek[dayOfWeekIndex];
    return dayOfWeek;
  }
  
  function getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); 
    const day = String(now.getDate()).padStart(2, '0');
  
    const currentDate = `${year}-${month}-${day}`;
    return currentDate;
  }
  
  const dateString = getCurrentDate();
  const dayOfWeek = getWeekDay(dateString);
  
  let url = `...?day=${dayOfWeek}&date=${dateString}`;
  await fetch(url);