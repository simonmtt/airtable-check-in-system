//CRON job: triggers every friday night for each week.
function getWeekDays(date) {
  const dayOfWeek = date.getDay(); // Get the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const daysUntilMonday = (dayOfWeek + 6) % 7; // Calculate the number of days to subtract to reach Monday

  const monday = new Date(date);
  monday.setDate(date.getDate() - daysUntilMonday);

  const formattedMonday = `${monday.getFullYear()}-${(monday.getMonth() + 1 + '').padStart(2, '0')}-${(monday.getDate() + '').padStart(2, '0')}`;
  const formattedFriday = `${date.getFullYear()}-${(date.getMonth() + 1 + '').padStart(2, '0')}-${(date.getDate() + '').padStart(2, '0')}`;

  return { formattedMonday, formattedFriday };
}

const now = new Date();
const { formattedMonday, formattedFriday } = getWeekDays(now);

const agentsTable = base.getTable('Agents');
const rapportTable = base.getTable('Rapports');
const pointagesTable = base.getTable('Pointages');
let agents = await agentsTable.selectRecordsAsync({
});

for (let agent of agents.records) {
  const mondayDate = new Date(formattedMonday);
  const fridayDate = new Date(formattedFriday);
  const pointages = agent.getCellValue('Pointages');
  const agentID = agent.id;

  let workedMinutes = 0;
  let expectedMinutes = 0;
  let selectedPointages = [];
  for (let pointage of pointages) {
    let pointageData = await pointagesTable.selectRecordAsync(pointage, {
    });
    let pointageID = pointageData.id;

    let minutesReelles = pointageData.getCellValue('Durée réelle mn');
    let minutesPrevues = pointageData.getCellValue('Durée prévue mn');
    let date = pointageData.getCellValue("Date d'intervention");

    let pointageDate = new Date(date);
    if (pointageDate >= mondayDate && pointageDate <= fridayDate) {
          if (minutesReelles) { workedMinutes += minutesReelles; }
          expectedMinutes += minutesPrevues;
          selectedPointages.push({id: pointageID})
    }
  }

  const timeDifference = workedMinutes - expectedMinutes;

  await rapportTable.createRecordAsync({
    'Agent': [{ id: agentID }],
    'Date de début': formattedMonday,
    'Date de fin': formattedFriday,
    'Type de rapport': { name: 'Weekly' },
    'Minutes prévues': expectedMinutes,
    'Minutes effectuées': workedMinutes,
    'Différence minutes prévues-effectuées': timeDifference,
    'Pointages': selectedPointages
  });
}