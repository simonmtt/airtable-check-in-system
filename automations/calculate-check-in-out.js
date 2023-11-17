function calculateTimeDifference(startTime, endTime) {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
  
    const totalStartMinutes = startHours * 60 + startMinutes;
    const totalEndMinutes = endHours * 60 + endMinutes;
  
    return totalEndMinutes - totalStartMinutes;
  }
  
  let inputConfig = input.config();
  let id = inputConfig.id;
  
  let table = base.getTable('Pointages');
  
  const actualStartTime = inputConfig.startTime;
  const actualEndTime = inputConfig.endTime;
  const expectedStartTime = inputConfig.expectedStartTime;
  const expectedEndTime = inputConfig.expectedEndTime;
  
  //
  
  let updateObj = {};
  
  if (expectedEndTime && expectedStartTime) {
  
    if (actualStartTime && actualEndTime) {
        updateObj['Durée réelle mn'] = calculateTimeDifference(actualStartTime, actualEndTime);
    }
  
    if (actualStartTime) {
      updateObj['Ecart arrivée prévue-réelle'] = calculateTimeDifference(expectedStartTime, actualStartTime);
    }
  
    if (actualEndTime) {
        updateObj['Ecart sortie prévue-réelle'] = calculateTimeDifference(expectedEndTime, actualEndTime);
    }
    
    updateObj['Durée prévue mn'] = calculateTimeDifference(expectedStartTime, expectedEndTime);
  }
  
  //update champ 'durée'
  await table.updateRecordAsync(id, updateObj);