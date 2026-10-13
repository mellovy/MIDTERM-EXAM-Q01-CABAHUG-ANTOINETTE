const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(__dirname));

function readPatients() {
  try {
    const text = fs.readFileSync(DATA_FILE, 'utf8');
    return text ? JSON.parse(text) : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function writePatients(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function nextId(records) {
  return records.length ? Math.max(...records.map((record) => record.id)) + 1 : 1;
}

function nextQueueNumber(records) {
  return records.reduce((highest, record) => Math.max(highest, Number(record.queue_number) || 0), 0) + 1;
}

// GET (ALL)

app.get('/api/patients', (req, res) => {
  res.json(readPatients());
});

// GET (ID)

app.get('/api/patients/:id', (req, res) => {
  const id = Number(req.params.id);
  const patient = readPatients().find((item) => item.id === id);

  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json(patient);
});

// POST

app.post('/api/patients', (req, res) => {
  const { patient_name, service, priority } = req.body || {};

  if (!patient_name || !service || priority === undefined || priority === null || priority === '') {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const records = readPatients();
  const newPatient = {
    id: nextId(records),
    patient_name,
    service,
    priority: Number(priority),
    queue_number: nextQueueNumber(records)
  };

  records.push(newPatient);
  writePatients(records);
  res.status(201).json(newPatient);
});

// DELETE 

app.delete('/api/patients/:id', (req, res) => {
  const id = Number(req.params.id);
  const records = readPatients();
  const index = records.findIndex((item) => item.id === id);

  if (index === -1) return res.status(404).json({ error: 'Patient not found' });

  records.splice(index, 1);
  writePatients(records);
  res.json({ message: 'Deleted' });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
