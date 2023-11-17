function calculateTimeDifference(startTime, endTime) {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const totalStartMinutes = startHours * 60 + startMinutes;
    const totalEndMinutes = endHours * 60 + endMinutes;
    const timeDifferenceInMinutes = totalEndMinutes - totalStartMinutes;

    return timeDifferenceInMinutes;
}

let inputConfig = input.config();
const startTime = inputConfig.startTime;
const endTime = inputConfig.endTime;

const timeDifferenceInMinutes = calculateTimeDifference(startTime, endTime);

let table = base.getTable('Planning agents');
let id = inputConfig.id;

//update champ 'durée'
await table.updateRecordAsync(id, {
    'Durée mn': timeDifferenceInMinutes
})