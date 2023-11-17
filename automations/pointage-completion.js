//get current day
function getCurrentDateAndTime(inputDateString) {
  const inputDate = new Date(inputDateString);
  const actualDate = new Date();
  const format = 'sv-SE'; //only way to get YYYY-MM-DD HH:mm formatting

  // Create a new Date object with the same timestamp but set to the Paris timezone
  const parisDate = new Date(inputDate.toLocaleString(format, { timeZone: 'Europe/Paris' }));
  const currentParisDate = new Date(actualDate.toLocaleString(format, { timeZone: 'Europe/Paris' }));

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

  const completionDate = parisDate.toLocaleString(format, formatDateOptions);
  const completionDateTime = parisDate.toLocaleString(format, formatDateTimeOptions);
  const completionTime = parisDate.toLocaleString(format, { hour: '2-digit', minute: '2-digit', hour12: false });
  const currentDateTime = currentParisDate.toLocaleString(format, formatDateTimeOptions);

  return { completionDate, completionDateTime, completionTime, currentDateTime };
}

//form data
let inputConfig = input.config();

let logSiteID = inputConfig.siteID;
let logCheckType = inputConfig.logType;
let logID = inputConfig.logID;
let logErrors = inputConfig.logErrors;
let logPointages = inputConfig.logPointages;

// define global dates variables
let completionDateForm = inputConfig.completionDateForm;
const { completionDate, completionDateTime, completionTime, currentDateTime } = getCurrentDateAndTime(completionDateForm);

//get tables
let siteTable = base.getTable('Sites');
let logsTable = base.getTable('Logs');
let pointageTable = base.getTable('Pointages');

//get all sites
let sites = await siteTable.selectRecordsAsync({})

//append site to log record if found - how top properly handle if error?
for (let site of sites.records) {
  if (site.id === logSiteID) {
    await logsTable.updateRecordAsync(logID, { 'Site': [{ id: site.id }] })
    break;
  }
}

//get todays's expected pointages
const automViewId = 'viwNCo4JZMKYqm1Rn'; // view = [autom] To check - today
const incomingPointagesView = pointageTable.getView(automViewId);
let pointages = await incomingPointagesView.selectRecordsAsync({ fields: ['Site', 'Check in status', 'Check out status', `Date d'intervention`, 'Logs', `Date d'arrivée prévue`, `Date de sortie prévue`] })

// iterate to find the corresponding pointage
for (let pointage of pointages.records) {
  //get pointage fields for calculations
  let pointageID = pointage.id;
  let checkInStatus = pointage.getCellValueAsString('Check in status')
  let checkOutStatus = pointage.getCellValueAsString('Check out status');
  let pointageSiteID = pointage.getCellValue('Site')[0];
  let pointageLogs = pointage.getCellValue('Logs');
  let expectedArrivalDateStr = pointage.getCellValueAsString(`Date d'arrivée prévue`);
  let expectedLeaveDateStr = pointage.getCellValueAsString('Date de sortie prévue');
  let expectedDateStr = logCheckType === 'Check in' ? expectedArrivalDateStr : expectedLeaveDateStr;

  let validID = false;
  let statusValue = "";

  if (logSiteID === pointageSiteID) { // corresponding pointage 

    //calculate time difference
    const expectedDate = new Date(expectedDateStr);
    const currentDate = new Date(completionDateTime);
    const timeDifference = (currentDate - expectedDate) / (1000 * 60);

    if (logCheckType === 'Check in') { //checks in

      statusValue = timeDifference > 30 ? 'Check in very late' : (timeDifference > 15 ? 'Check in late' : 'Check in');

      if (!pointageLogs && checkInStatus === 'To check in') {

        await logsTable.updateRecordAsync(logID, {
          'Pointage': [{ id: pointageID }],
          'Status': { name: 'Valide' },
        })

        await pointageTable.updateRecordAsync(pointageID, {
          "Check in status": { name: statusValue },
          "Date d'arrivée réelle": completionDateTime,
          "Heure d'arrivée réelle": completionTime,
          "Ecart arrivée prévue-réelle": timeDifference
        })

        validID = true;
        
      } else {

        await logsTable.updateRecordAsync(logID, {
          'Status': { name: 'Erreur' },
          'Log errors': `${currentDateTime}: Le check-in pour ce site a déjà été rempli ou forcé.\n${logErrors}`
        })

      }

    } else if (logCheckType === 'Check out') { //checks out

      statusValue = timeDifference > 15 ? 'Check out late' : 'Check out';

      if (pointageLogs && (checkOutStatus === 'To check out' && checkInStatus !== 'To check in')) {

        await logsTable.updateRecordAsync(logID, {
          'Pointage': [{ id: pointageID }],
          'Status': { name: 'Valide' },
        })

        await pointageTable.updateRecordAsync(pointageID, {
          'Check out status': { name: statusValue },
          "Date de sortie réelle": completionDateTime,
          "Heure de sortie réelle": completionTime,
          "Ecart sortie prévue-réelle": timeDifference
        })

        validID = true;

      } else if (checkInStatus === 'To check in') {

        await logsTable.updateRecordAsync(logID, {
          'Status': { name: 'Erreur' },
          'Log errors': `${currentDateTime}: Une tentative de check out a eu lieu avant la validation du check in.\n${logErrors}`
        })

      } else if (checkOutStatus !== 'To check out') {

        await logsTable.updateRecordAsync(logID, {
          'Status': { name: 'Erreur' },
          'Log errors': `${currentDateTime}: Le check-out pour ce site a déjà été rempli ou forcé.\n${logErrors}`
        })

      }
      
      else {

        await logsTable.updateRecordAsync(logID, {
          'Status': { name: 'Erreur' },
          'Log errors': `${currentDateTime}: Une erreur est survenue lors de la validation du check out.\n${logErrors}`
        })

      }

    } else {
      await logsTable.updateRecordAsync(logID, {
        'Status': { name: 'Erreur' },
        'Log errors': `${currentDateTime}: Une erreur imprévue est survenue. Veuillez consulter les logs pour ce record.\n${logErrors}`
      })
    }
  }

  if (validID) {
    const data = [{ id: pointageID, status: statusValue }];
    const encodedJson = encodeURIComponent(JSON.stringify(data));
    const url = `...?data=${encodedJson}`;
    await fetch(url);
  }
}