//CRON job: triggers every last day of the month (trigger logic handled by Airtable).
function getFirstAndLastWorkedDaysOfMonth(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0);
  
    // Trouver le premier jour travaillé du mois
    let firstWorkedDay = new Date(year, month, 1);
    while (firstWorkedDay.getDay() === 0 || firstWorkedDay.getDay() === 6) { //would benefit from isWeekDay() function
      firstWorkedDay.setDate(firstWorkedDay.getDate() + 1);
    }
  
    // Trouver le dernier jour travaillé du mois
    let lastWorkedDay = new Date(year, month, lastDayOfMonth.getDate());
    while (lastWorkedDay.getDay() === 0 || lastWorkedDay.getDay() === 6) {
      lastWorkedDay.setDate(lastWorkedDay.getDate() - 1);
    }
  
    // Formater les dates au format 'AAAA-MM-JJ'
    const formattedFirstDay = `${firstWorkedDay.getFullYear()}-${(firstWorkedDay.getMonth() + 1 + '').padStart(2, '0')}-${(firstWorkedDay.getDate() + '').padStart(2, '0')}`;
    const formattedLastDay = `${lastWorkedDay.getFullYear()}-${(lastWorkedDay.getMonth() + 1 + '').padStart(2, '0')}-${(lastWorkedDay.getDate() + '').padStart(2, '0')}`;
  
    return { formattedFirstDay, formattedLastDay };
  }
  
  // Exemple d'utilisation : exécutez cette fonction le dernier jour du mois.
  const now = new Date(); // En supposant que c'est le dernier jour du mois.
  const { formattedFirstDay, formattedLastDay } = getFirstAndLastWorkedDaysOfMonth(now);
  
  const agentsTable = base.getTable('Agents');
  const rapportTable = base.getTable('Rapports');
  const pointagesTable = base.getTable('Pointages');
  
  const agentsQuery = await agentsTable.selectRecordsAsync({
    fields: ['Pointages', 'Total minutes hebdo'], // Ajoutez les champs dont vous avez besoin ici
  });
  
  // Récupérez tous les enregistrements de pointage et stockez-les dans un objet de mappage
  const pointageRecords = await pointagesTable.selectRecordsAsync({
    fields: ['Durée réelle mn', 'Durée prévue mn', "Date d'intervention"],
  });
  const pointageMap = {};
  for (const pointageRecord of pointageRecords.records) {
    pointageMap[pointageRecord.id] = {
      minutesReelles: pointageRecord.getCellValue('Durée réelle mn'),
      minutesPrevues: pointageRecord.getCellValue('Durée prévue mn'),
      date: pointageRecord.getCellValue("Date d'intervention"),
    };
  }
  
  // Définissez un tableau pour stocker toutes les mises à jour
  const updates = [];
  
  for (let agent of agentsQuery.records) {
    const firstDayDate = new Date(formattedFirstDay);
    const lastDayDate = new Date(formattedLastDay);
    const pointages = agent.getCellValue('Pointages');
    // const expectedMinutes = agent.getCellValue('Total minutes hebdo');
    const agentID = agent.id;
  
    let workedMinutes = 0;
    let expectedMinutes = 0;
    let selectedPointages = [];
  
    for (let pointage of pointages) {
      const pointageData = pointageMap[pointage];
      if (!pointageData) {
        continue;
      }
  
      let minutesReelles = pointageData.minutesReelles;
      let minutesPrevues = pointageData.minutesPrevues;
      let date = pointageData.date;
      let pointageDate = new Date(date);
  
      if (pointageDate >= firstDayDate && pointageDate <= lastDayDate) {
        if (minutesReelles) {
          workedMinutes += minutesReelles;
        }
        expectedMinutes += minutesPrevues;
        selectedPointages.push({ id: pointage });
      }
    }
  
    const timeDifference = workedMinutes - expectedMinutes;
  
    // Ajoutez les mises à jour au tableau
    updates.push({
      fields: {
        'Agent': [{ id: agentID }],
        'Date de début': formattedFirstDay,
        'Date de fin': formattedLastDay,
        'Type de rapport': { name: 'Monthly' },
        'Minutes prévues': expectedMinutes,
        'Minutes effectuées': workedMinutes,
        'Différence minutes prévues-effectuées': timeDifference,
        'Pointages': selectedPointages,
      },
    });
  }
  
  // Créez en lot des enregistrements dans la table Rapports
  await rapportTable.createRecordsAsync(updates);