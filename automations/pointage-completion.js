//get current day
function getCurrentDateAndTime(inputDateString) {
  const inputDate = new Date(inputDateString);
  const format = 'sv-SE'; //only way to get YYYY-MM-DD HH:mm formatting

  // Create a new Date object with the same timestamp but set to the Paris timezone
  const parisDate = new Date(inputDate.toLocaleString(format, { timeZone: 'Europe/Paris' }));

  // Format the Paris date with the desired output formats
  const formatDateOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  const formatDateTimeOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };

  const currentDate = parisDate.toLocaleString(format, formatDateOptions).replace(/\//g, '-');
  const currentDateTime = parisDate.toLocaleString(format, formatDateTimeOptions).replace(/\//g, '-').replace(',', ''); // Remove the comma here
  const currentTime = parisDate.toLocaleString(format, { hour: '2-digit', minute: '2-digit', hour12: false });

  return { currentDate, currentDateTime, currentTime }; // Adjust currentDate format
}

//form data
let inputConfig = input.config();
let logSiteID = inputConfig.siteID;
let logType = inputConfig.logType;
let logID = inputConfig.logID;
let errorLogs = inputConfig.errorLogs;
let logPointages = inputConfig.logPointages;
let completionDate = inputConfig.completionDate;
const { currentDate, currentDateTime, currentTime } = getCurrentDateAndTime(completionDate);

//get tables
let siteTable = base.getTable('Sites');
let logsTable = base.getTable('Logs');
let pointageTable = base.getTable('Pointages');

//get all sites
let sites = await siteTable.selectRecordsAsync({
})

//append site to log record if found - how top properly handle if error?
for (let site of sites.records) {
  if (site.id === logSiteID) {
    await logsTable.updateRecordAsync(logID, {
      'Site': [{ id: site.id }]
    })
  }
}

//get all pointages
let pointages = await pointageTable.selectRecordsAsync({
  fields: ['Site', 'Check in status', 'Check out status', `Date d'intervention`, 'Logs', `Date d'arrivée prévue`, `Date de sortie prévue`]
})

for (let pointage of pointages.records) {
  //get pointage fields for calculations
  let pointageID = pointage.id;
  let checkInStatus = pointage.getCellValueAsString('Check in status')
  let checkOutStatus = pointage.getCellValueAsString('Check out status');
  let pointageSiteID = pointage.getCellValue('Site')[0];
  let pointageLogs = pointage.getCellValue('Logs');
  let pointageDate = pointage.getCellValueAsString(`Date d'intervention`);
  let expectedArrivalDateStr = pointage.getCellValueAsString(`Date d'arrivée prévue`);
  let expectedLeaveDateStr = pointage.getCellValueAsString('Date de sortie prévue');
  let expectedDateStr = logType === 'Check in' ? expectedArrivalDateStr : expectedLeaveDateStr;

  if (logSiteID === pointageSiteID && pointageDate === currentDate) {
    //calculate time difference
    const expectedDate = new Date(expectedDateStr);
    const currentDate = new Date(currentDateTime);
    const TimeDifference = (currentDate - expectedDate) / (1000 * 60);

    // refactoriser ici
    if (logType === 'Check in') { //checks in
      let statusValue = TimeDifference > 15 ? 'Check in late' : 'Check in';

      if (!pointageLogs && checkInStatus === 'To check in') {
        await logsTable.updateRecordAsync(logID, {
          'Pointage': [{ id: pointageID }],
          'Status': { name: 'Valide' },
        })
        await pointageTable.updateRecordAsync(pointageID, {
          "Check in status": { name: statusValue },
          "Date d'arrivée réelle": currentDateTime,
          "Heure d'arrivée réelle": currentTime,
          "Ecart arrivée prévue-réelle": TimeDifference
          //caculs
        })
      } else {
        await logsTable.updateRecordAsync(logID, {
          'Status': { name: 'Erreur' },
          'Error logs': `${currentDateTime}: Le check-in pour ce site a déjà été rempli.\n${errorLogs}`
        })
      }

    } else if (logType === 'Check out') { //checks out
      let statusValue = TimeDifference > 15 ? 'Check out late' : 'Check out';

      if (pointageLogs && (checkOutStatus === 'To check out' && checkInStatus !== 'To check in')) {
        await logsTable.updateRecordAsync(logID, {
          'Pointage': [{ id: pointageID }],
          'Status': { name: 'Valide' },
        })
        await pointageTable.updateRecordAsync(pointageID, {
          'Check out status': { name: statusValue },
          "Date de sortie réelle": currentDateTime,
          "Heure de sortie réelle": currentTime,
          "Ecart sortie prévue-réelle": TimeDifference
        })
      } else if (checkInStatus !== 'To check in') {
        await logsTable.updateRecordAsync(logID, {
          'Status': { name: 'Erreur' },
          'Error logs': `${currentDateTime}: Une tentative de Check Out a eu lieu avant la validation du Check In.\n${errorLogs}`
        })
      } else {
        await logsTable.updateRecordAsync(logID, {
          'Status': { name: 'Erreur' },
          'Error logs': `${currentDateTime}: Le check-out pour ce site a déjà été rempli ou forcé.\n${errorLogs}`
        })
      }

    } else {
      await logsTable.updateRecordAsync(logID, {
        'Status': { name: 'Erreur' },
        'Error logs': `${currentDateTime}: Une erreur imprévue est survenue. Veuillez consulter les logs pour ce record.\n${errorLogs}`
      })
    }
  }
}