// ---------- Shared data layer ----------
// Real booking records transcribed from MICNIC.xlsx (MAY/JUNE/JULY sheets).
// Loaded/saved via localStorage so edits made on the Bookings page carry
// over to the Finances dashboard (no backend yet — this is per-browser
// only, and won't sync live across two open tabs).

const BOOKINGS_SEED = {
  '2026-05': [
    { id: 'B001', dateBooked: '2026-05-24', guest: 'Diana', apartment: '1014', checkin: '2026-05-24', checkout: '2026-05-25', total: 240000, hostShare: 216000, commission: 24000, amountPaid: 240000, remaining: 0, hostPaid: '216000', status: '' },
    { id: 'B002', dateBooked: '2026-05-24', guest: 'Vivian', apartment: '1013', checkin: '2026-05-26', checkout: '2026-05-27', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B003', dateBooked: '2026-05-26', guest: 'RAHILA', apartment: '103', checkin: '2026-06-25', checkout: '2026-06-28', total: 750000, hostShare: 675000, commission: 75000, amountPaid: 250000, remaining: 500000, hostPaid: '225,000+185,000', status: '' },
    { id: 'B004', dateBooked: '2026-05-27', guest: 'MUNIRA MASOUD', apartment: '', checkin: '2026-05-27', checkout: '2026-05-28', total: 260000, hostShare: 234000, commission: 26000, amountPaid: 260000, remaining: 0, hostPaid: '234000', status: '' },
    { id: 'B005', dateBooked: '2026-05-27', guest: 'SEURI KUOKO', apartment: '', checkin: '2026-05-27', checkout: '2026-05-28', total: 260000, hostShare: 234000, commission: 26000, amountPaid: 260000, remaining: 0, hostPaid: '234000', status: '' },
    { id: 'B006', dateBooked: '2026-05-28', guest: 'NOELLAH MWITA', apartment: '', checkin: '2026-05-28', checkout: '2026-05-30', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B007', dateBooked: '2026-05-28', guest: 'TODD ALEXANDER', apartment: '', checkin: '2026-05-29', checkout: '2026-05-30', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B008', dateBooked: '2026-05-28', guest: 'TODD ALEXANDER', apartment: '', checkin: '2026-05-29', checkout: '2026-05-30', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B009', dateBooked: '2026-05-29', guest: 'FARAJA NJAU', apartment: 'MPV 05', checkin: '2026-05-29', checkout: '2026-05-30', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B010', dateBooked: '2026-05-30', guest: 'NANCY', apartment: '', checkin: '2026-05-30', checkout: '2026-05-31', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B011', dateBooked: '2026-05-31', guest: 'IAN', apartment: '', checkin: '2026-05-31', checkout: '2026-06-02', total: 520000, hostShare: 468000, commission: 52000, amountPaid: 520000, remaining: 0, hostPaid: '468000', status: '' },
    { id: 'B012', dateBooked: '2026-05-31', guest: 'ALISTARICO', apartment: '', checkin: '2026-06-02', checkout: '2026-06-03', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 260000, remaining: 0, hostPaid: '225000', status: '' },
  ],
  '2026-06': [
    { id: 'B001', dateBooked: '2026-06-01', guest: 'JACQULINE', apartment: 'Mikocheni 4', checkin: '2026-06-06', checkout: '2026-06-07', total: 280000, hostShare: 250000, commission: 30000, amountPaid: 280000, remaining: 0, hostPaid: '250000', status: '' },
    { id: 'B002', dateBooked: '2026-06-02', guest: 'DAVIS MOSHA', apartment: 'Masaki', checkin: '2026-06-04', checkout: '2026-06-06', total: 500000, hostShare: 450000, commission: 50000, amountPaid: 500000, remaining: 0, hostPaid: '450000', status: '' },
    { id: 'B003', dateBooked: '2026-06-03', guest: 'JANETH', apartment: 'Mikocheni 3', checkin: '2026-06-03', checkout: '2026-06-19', total: 3520000, hostShare: 3168000, commission: 352000, amountPaid: 3520000, remaining: 0, hostPaid: '3168000', status: '' },
    { id: 'B004', dateBooked: '2026-06-04', guest: 'HASSAN', apartment: 'Masaki', checkin: '2026-06-04', checkout: '2026-06-05', total: 255000, hostShare: 229500, commission: 25500, amountPaid: 255000, remaining: 0, hostPaid: '229500', status: '' },
    { id: 'B005', dateBooked: '2026-06-04', guest: 'HAMISI KONDO', apartment: 'Masaki', checkin: '2026-06-06', checkout: '2026-06-08', total: 500000, hostShare: 450000, commission: 50000, amountPaid: 500000, remaining: 0, hostPaid: '450000', status: '' },
    { id: 'B006', dateBooked: '2026-06-01', guest: 'ALICE', apartment: 'Masaki', checkin: '2026-06-01', checkout: '2026-06-02', total: 265000, hostShare: 238500, commission: 26500, amountPaid: 265000, remaining: 0, hostPaid: '238500', status: '' },
    { id: 'B007', dateBooked: '2026-06-04', guest: 'NASSORO', apartment: 'Masaki', checkin: '2026-06-06', checkout: '2026-06-08', total: 500000, hostShare: 450000, commission: 50000, amountPaid: 500000, remaining: 0, hostPaid: '450000', status: '' },
    { id: 'B008', dateBooked: '2026-06-04', guest: 'DELIDA', apartment: 'masaki studio', checkin: '2026-06-04', checkout: '2026-06-08', total: 840000, hostShare: 756000, commission: 84000, amountPaid: 840000, remaining: 0, hostPaid: '756000', status: '' },
    { id: 'B009', dateBooked: '2026-06-05', guest: 'ZAYN OMARY', apartment: 'Masaki', checkin: '2026-06-05', checkout: '2026-06-06', total: 260000, hostShare: 234000, commission: 26000, amountPaid: 260000, remaining: 0, hostPaid: '234000', status: '' },
    { id: 'B010', dateBooked: '2026-06-05', guest: 'SHAMSA', apartment: 'Masaki', checkin: '2026-06-06', checkout: '2026-06-07', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B011', dateBooked: '2026-06-05', guest: 'ERICK', apartment: 'Masaki', checkin: '2026-06-08', checkout: '2026-06-10', total: 480000, hostShare: 432000, commission: 48000, amountPaid: 480000, remaining: 0, hostPaid: '432000', status: '' },
    { id: 'B012', dateBooked: '2026-06-05', guest: 'FAITH', apartment: 'Masaki', checkin: '2026-06-06', checkout: '2026-06-07', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B013', dateBooked: '2026-06-05', guest: 'SHADYA', apartment: 'Masaki', checkin: '2026-06-05', checkout: '2026-06-06', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B014', dateBooked: '2026-06-06', guest: 'MIRAJI', apartment: 'Masaki', checkin: '2026-06-06', checkout: '2026-06-07', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B015', dateBooked: '2026-06-06', guest: 'NB KENYA', apartment: 'Masaki', checkin: '2026-06-06', checkout: '2026-06-09', total: 680000, hostShare: 612000, commission: 68000, amountPaid: 680000, remaining: 0, hostPaid: '680000', status: '' },
    { id: 'B016', dateBooked: '2026-06-06', guest: 'HASSAN AHMED', apartment: 'Masaki', checkin: '2026-06-06', checkout: '2026-06-07', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B017', dateBooked: '2026-06-06', guest: 'IRENE ANTONY', apartment: 'Masaki', checkin: '2026-06-07', checkout: '2026-06-08', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B018', dateBooked: '2026-06-07', guest: 'JACQULINE', apartment: 'MIKOCHENI 4', checkin: '2026-06-07', checkout: '2026-06-08', total: 280000, hostShare: 250000, commission: 30000, amountPaid: 280000, remaining: 0, hostPaid: '250000', status: '' },
    { id: 'B019', dateBooked: '2026-06-08', guest: 'ALEXANDER', apartment: 'Masaki', checkin: '2026-06-12', checkout: '2026-06-13', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B020', dateBooked: '2026-06-08', guest: 'VICTOR MAGUBIKA', apartment: 'MIKOCHENI 4', checkin: '2026-06-08', checkout: '2026-06-09', total: 280000, hostShare: 250000, commission: 30000, amountPaid: 280000, remaining: 0, hostPaid: '250000', status: '' },
    { id: 'B021', dateBooked: '2026-06-09', guest: 'JACKLINE SHAYO', apartment: 'Masaki', checkin: '2026-06-10', checkout: '2026-06-11', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B022', dateBooked: '2026-06-10', guest: 'AMANI NJABILI', apartment: 'MPV', checkin: '2026-06-10', checkout: '2026-06-11', total: 240000, hostShare: 216000, commission: 24000, amountPaid: 240000, remaining: 0, hostPaid: '216000', status: '' },
    { id: 'B023', dateBooked: '2026-06-11', guest: 'MUSSA JUMA', apartment: 'Masaki', checkin: '2026-06-13', checkout: '2026-06-14', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 125000, remaining: 125000, hostPaid: '112500', status: "DIDN'T STAY" },
    { id: 'B024', dateBooked: '2026-06-10', guest: 'ALLY KENYA', apartment: 'MASAKI', checkin: '2026-06-09', checkout: '2026-06-11', total: 440000, hostShare: 396000, commission: 44000, amountPaid: 0, remaining: 440000, hostPaid: '0', status: '' },
    { id: 'B025', dateBooked: '2026-06-11', guest: 'TRACY', apartment: 'Masaki', checkin: '2026-06-11', checkout: '2026-06-12', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B026', dateBooked: '2026-06-11', guest: 'DENIS', apartment: 'MPV 4', checkin: '2026-06-12', checkout: '2026-06-13', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B027', dateBooked: '2026-06-12', guest: 'BARNABAS', apartment: 'Masaki', checkin: '2026-06-12', checkout: '2026-06-13', total: 260000, hostShare: 234000, commission: 26000, amountPaid: 260000, remaining: 0, hostPaid: '260000', status: '' },
    { id: 'B028', dateBooked: '2026-06-12', guest: 'ANDREW', apartment: 'Masaki', checkin: '2026-06-12', checkout: '2026-06-13', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B029', dateBooked: '2026-06-12', guest: 'ROSE', apartment: 'Masaki STUDIO', checkin: '2026-06-12', checkout: '2026-06-13', total: 200000, hostShare: 180000, commission: 20000, amountPaid: 200000, remaining: 0, hostPaid: '180000', status: '' },
    { id: 'B030', dateBooked: '2026-06-12', guest: 'MWAJUMA', apartment: 'Masaki', checkin: '2026-06-13', checkout: '2026-06-15', total: 500000, hostShare: 450000, commission: 50000, amountPaid: 500000, remaining: 0, hostPaid: '450000', status: '' },
    { id: 'B031', dateBooked: '2026-06-13', guest: 'LEBRON', apartment: 'Masaki', checkin: '2026-06-13', checkout: '2026-06-14', total: 240000, hostShare: 216000, commission: 24000, amountPaid: 240000, remaining: 0, hostPaid: '216000', status: '' },
    { id: 'B032', dateBooked: '2026-06-16', guest: 'ANDREW', apartment: 'Masaki', checkin: '2026-06-17', checkout: '2026-06-18', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B033', dateBooked: '2026-06-17', guest: 'IRENE MARCO', apartment: 'Masaki', checkin: '2026-06-28', checkout: '2026-06-29', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B034', dateBooked: '2026-06-18', guest: 'SOLO', apartment: 'Micnic masaki', checkin: '2026-06-19', checkout: '2026-06-23', total: 1060000, hostShare: 954000, commission: 106000, amountPaid: 1060000, remaining: 0, hostPaid: '954000', status: '' },
    { id: 'B035', dateBooked: '2026-06-19', guest: 'SALEMI GBADEBO', apartment: 'Micnic masaki', checkin: '2026-06-20', checkout: '2026-07-04', total: 2870000, hostShare: 2583000, commission: 287000, amountPaid: 2870000, remaining: 0, hostPaid: '2583000', status: '' },
    { id: 'B036', dateBooked: '2026-06-18', guest: 'FATMA TAMBWE', apartment: 'Micnic Masaki', checkin: '2026-06-18', checkout: '2026-06-20', total: 420000, hostShare: 378000, commission: 42000, amountPaid: 420000, remaining: 0, hostPaid: '378000', status: '' },
    { id: 'B037', dateBooked: '2026-06-19', guest: 'TANGIMU', apartment: 'Micnic masaki', checkin: '2026-06-19', checkout: '2026-06-20', total: 200000, hostShare: 180000, commission: 20000, amountPaid: 200000, remaining: 0, hostPaid: '180000', status: '' },
    { id: 'B038', dateBooked: '2026-06-20', guest: 'BUDDY', apartment: 'Micnic masaki', checkin: '2026-06-19', checkout: '2026-06-23', total: 2600000, hostShare: 2340000, commission: 260000, amountPaid: 2600000, remaining: 0, hostPaid: '2340000', status: '' },
    { id: 'B039', dateBooked: '2026-06-22', guest: 'JOVIN JONAS', apartment: 'MPV 3', checkin: '2026-06-21', checkout: '2026-06-22', total: 200000, hostShare: 180000, commission: 20000, amountPaid: 200000, remaining: 0, hostPaid: '180000', status: '' },
    { id: 'B040', dateBooked: '2026-06-23', guest: 'ISMAIL', apartment: 'micnic masaki', checkin: '2026-06-22', checkout: '2026-06-25', total: 960000, hostShare: 864000, commission: 96000, amountPaid: 960000, remaining: 0, hostPaid: '864000', status: '' },
    { id: 'B041', dateBooked: '2026-06-24', guest: 'MUNIRU', apartment: 'MASAKI', checkin: '2026-06-24', checkout: '2026-06-26', total: 440000, hostShare: 396000, commission: 44000, amountPaid: 440000, remaining: 0, hostPaid: '396000', status: '' },
    { id: 'B042', dateBooked: '2026-06-25', guest: 'GADAU', apartment: 'masaki', checkin: '2026-06-27', checkout: '2026-06-28', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B043', dateBooked: '2026-06-25', guest: 'RASHID KAPANDE', apartment: 'MIKOCHENI 4', checkin: '2026-06-25', checkout: '2026-06-26', total: 270000, hostShare: 240000, commission: 30000, amountPaid: 270000, remaining: 0, hostPaid: '240000', status: '' },
    { id: 'B044', dateBooked: '2026-06-25', guest: 'MUNDHIR', apartment: 'Micnic masaki', checkin: '2026-06-26', checkout: '2026-06-27', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B045', dateBooked: '2026-06-26', guest: 'ELISA', apartment: '108', checkin: '2026-06-26', checkout: '2026-06-27', total: 270000, hostShare: 240000, commission: 30000, amountPaid: 270000, remaining: 0, hostPaid: '240000', status: '' },
    { id: 'B046', dateBooked: '2026-06-26', guest: 'HAVELAND MTWEVE', apartment: '109', checkin: '2026-06-26', checkout: '2026-06-27', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B047', dateBooked: '2026-06-28', guest: 'STEPHEN OMARI', apartment: '102', checkin: '2026-06-28', checkout: '2026-06-29', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B048', dateBooked: '2026-06-28', guest: 'MAGRETH', apartment: '109', checkin: '2026-06-29', checkout: '2026-07-04', total: 1150000, hostShare: 1035000, commission: 115000, amountPaid: 1150000, remaining: 0, hostPaid: '1035000', status: '' },
    { id: 'B049', dateBooked: '2026-06-29', guest: 'ISAACK', apartment: 'Micnic masaki', checkin: '2026-06-29', checkout: '2026-06-30', total: 265000, hostShare: 238500, commission: 26500, amountPaid: 265000, remaining: 0, hostPaid: '238500', status: '' },
    { id: 'B050', dateBooked: '2026-06-30', guest: 'GLOIRE BILZ', apartment: 'Micnic masaki', checkin: '2026-06-30', checkout: '2026-07-01', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
  ],
  '2026-07': [
    { id: 'B001', dateBooked: '2026-07-02', guest: 'ALICE', apartment: 'micnic mikocheni', checkin: '2026-07-04', checkout: '2026-07-05', total: 280000, hostShare: 250000, commission: 30000, amountPaid: 280000, remaining: 0, hostPaid: '250000', status: '' },
    { id: 'B002', dateBooked: '2026-07-02', guest: 'GLORY', apartment: 'Micnic masaki', checkin: '2026-07-05', checkout: '2026-07-06', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B003', dateBooked: '2026-07-02', guest: 'ARMAAN', apartment: 'Micnic masaki', checkin: '2026-07-02', checkout: '2026-07-04', total: 500000, hostShare: 450000, commission: 50000, amountPaid: 500000, remaining: 0, hostPaid: '450000', status: '' },
    { id: 'B004', dateBooked: '2026-07-02', guest: 'VEE', apartment: 'micnic mikocheni', checkin: '2026-07-03', checkout: '2026-07-04', total: 280000, hostShare: 250000, commission: 30000, amountPaid: 280000, remaining: 0, hostPaid: '250000', status: '' },
    { id: 'B005', dateBooked: '2026-07-03', guest: 'LEBRON', apartment: 'Micnic masaki', checkin: '2026-07-03', checkout: '2026-07-05', total: 500000, hostShare: 450000, commission: 50000, amountPaid: 500000, remaining: 0, hostPaid: '450000', status: '' },
    { id: 'B006', dateBooked: '2026-07-03', guest: 'NICE GEORGE', apartment: 'Micnic masaki', checkin: '2026-07-04', checkout: '2026-07-05', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B007', dateBooked: '2026-07-04', guest: 'AGATHA', apartment: 'Micnic masaki', checkin: '2026-07-04', checkout: '2026-07-05', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B008', dateBooked: '2026-07-04', guest: 'MAGRETH', apartment: 'Micnic masaki', checkin: '2026-07-04', checkout: '2026-07-06', total: 500000, hostShare: 450000, commission: 50000, amountPaid: 500000, remaining: 0, hostPaid: '450000', status: '' },
    { id: 'B009', dateBooked: '2026-07-06', guest: 'MMM', apartment: 'Micnic masaki', checkin: '2026-07-06', checkout: '2026-07-07', total: 230000, hostShare: 207000, commission: 23000, amountPaid: 230000, remaining: 0, hostPaid: '207000', status: '' },
    { id: 'B010', dateBooked: '2026-07-09', guest: 'NASSORO SAID', apartment: 'Micnic masaki', checkin: '2026-07-09', checkout: '2026-07-12', total: 720000, hostShare: 648000, commission: 72000, amountPaid: 720000, remaining: 0, hostPaid: '648000', status: '' },
    { id: 'B011', dateBooked: '2026-07-09', guest: 'JOSHUA MWASA', apartment: 'Micnic masaki', checkin: '2026-07-09', checkout: '2026-07-10', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B012', dateBooked: '2026-07-10', guest: 'ANGEL KASSORO', apartment: 'Micnic masaki', checkin: '2026-07-11', checkout: '2026-07-12', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B013', dateBooked: '2026-07-10', guest: 'KELVIN', apartment: 'Micnic masaki', checkin: '2026-07-10', checkout: '2026-07-13', total: 630000, hostShare: 567000, commission: 63000, amountPaid: 630000, remaining: 0, hostPaid: '567000', status: '' },
    { id: 'B014', dateBooked: '2026-07-11', guest: 'DEUS', apartment: 'Micnic masaki', checkin: '2026-07-11', checkout: '2026-07-12', total: 200000, hostShare: 180000, commission: 20000, amountPaid: 200000, remaining: 0, hostPaid: '180000', status: '' },
    { id: 'B015', dateBooked: '2026-07-13', guest: 'NASSORO SAID', apartment: 'Micnic masaki', checkin: '2026-07-12', checkout: '2026-07-15', total: 690000, hostShare: 621000, commission: 69000, amountPaid: 690000, remaining: 0, hostPaid: '621000', status: '' },
    { id: 'B016', dateBooked: '2026-07-15', guest: 'DEODATUS', apartment: 'Micnic masaki', checkin: '2026-07-15', checkout: '2026-07-16', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B017', dateBooked: '2026-07-16', guest: 'STEWART', apartment: 'Micnic masaki', checkin: '2026-07-16', checkout: '2026-07-19', total: 650000, hostShare: 585000, commission: 65000, amountPaid: 650000, remaining: 0, hostPaid: '585000', status: '' },
    { id: 'B018', dateBooked: '2026-07-16', guest: 'BENEDICTOR', apartment: 'Micnic masaki', checkin: '2026-07-16', checkout: '2026-07-17', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 250000, remaining: 0, hostPaid: '225000', status: '' },
    { id: 'B019', dateBooked: '2026-07-17', guest: 'SHAMNI ALLY', apartment: 'Micnic masaki', checkin: '2026-07-18', checkout: '2026-07-19', total: 250000, hostShare: 225000, commission: 25000, amountPaid: 100000, remaining: 150000, hostPaid: '90000', status: '' },
    { id: 'B020', dateBooked: '2026-07-17', guest: 'IRENE MANZI', apartment: 'Micnic masaki', checkin: '2026-07-17', checkout: '2026-07-19', total: 500000, hostShare: 450000, commission: 50000, amountPaid: 500000, remaining: 0, hostPaid: '450000', status: '' },
  ],
};

const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAY_LABELS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];

// ---------- Month keys ----------
// Bookings are grouped by "YYYY-MM" (the check-in date's year and month),
// not a fixed list — new months appear automatically as bookings land in
// them, and lexicographic sort on "YYYY-MM" is chronological sort for free.
// Local calendar date as "YYYY-MM-DD" — NOT toISOString(), which reads
// UTC and would misfile the first few hours of each local day into the
// previous day/month for a UTC+3 (Tanzania) user.
function todayIsoLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayMonthKey() {
  return todayIsoLocal().slice(0, 7);
}

function monthKeysOf(data) {
  return Object.keys(data).sort();
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return `${MONTHS_FULL[month - 1]} ${year}`;
}

function monthShortLabel(key) {
  const [, month] = key.split('-').map(Number);
  return MONTHS_FULL[month - 1].slice(0, 3).toUpperCase();
}

// Which month bucket a booking belongs in — always derived from its
// check-in date, never chosen by hand, so it can't drift out of sync.
function bookingMonthKey(booking) {
  return booking.checkin ? booking.checkin.slice(0, 7) : null;
}

const STATUS_META = {
  'COMPLETED':   { label: 'Completed',   cls: 'delivered' },
  'ACTIVE':      { label: 'Active',      cls: 'processed' },
  'UPCOMING':    { label: 'Upcoming',    cls: 'upcoming'  },
  "DIDN'T STAY": { label: "Didn't stay", cls: 'cancelled' },
};

// The only thing ever set by hand is "didn't stay" (a no-show the owner
// flags manually) — every other status is derived live from today's date
// vs. check-in/check-out, so it can never go stale.
function computeBookingStatus(booking, today) {
  if (booking.status === "DIDN'T STAY") return "DIDN'T STAY";
  if (!booking.checkin) return 'UPCOMING';
  const checkin = new Date(booking.checkin + 'T00:00:00');
  if (today < checkin) return 'UPCOMING';
  const checkout = booking.checkout ? new Date(booking.checkout + 'T00:00:00') : checkin;
  if (today <= checkout) return 'ACTIVE';
  return 'COMPLETED';
}

const BOOKINGS_STORAGE_KEY = 'urbanhomes-bookings-v1';

function cloneSeed() {
  const clone = {};
  Object.keys(BOOKINGS_SEED).forEach(key => { clone[key] = BOOKINGS_SEED[key].map(r => ({ ...r })); });
  return clone;
}

// One-time upgrade for bookings saved before month buckets became
// "YYYY-MM" keys — remaps the old fixed may/june/july keys so data saved
// in an earlier session isn't orphaned under a key nothing looks up anymore.
const LEGACY_MONTH_KEYS = { may: '2026-05', june: '2026-06', july: '2026-07' };

function loadBookings() {
  try {
    const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (!raw) return cloneSeed();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return cloneSeed();

    let migrated = false;
    const data = {};
    Object.keys(parsed).forEach(key => {
      const newKey = LEGACY_MONTH_KEYS[key] || key;
      if (newKey !== key) migrated = true;
      data[newKey] = parsed[key];
    });
    if (migrated) saveBookings(data);
    return data;
  } catch (e) {
    return cloneSeed();
  }
}

function saveBookings(data) {
  try {
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // Storage unavailable (private browsing, quota) — in-memory state
    // for this page load still works, it just won't persist.
  }
}

// Flattens { "2026-05":[...], "2026-06":[...], ... } into one array, each
// row tagged with its month key — convenient for cross-month totals.
function allBookings(data) {
  return monthKeysOf(data).flatMap(month => data[month].map(b => ({ ...b, month })));
}

// ---------- Custom hosts (added via the Host page) ----------
// { key, name, icon, keywords: [...] } — keywords are matched against
// a booking's apartment field (lowercased, substring match) to decide
// which host it counts toward.
const CUSTOM_HOSTS_KEY = 'urbanhomes-custom-hosts-v1';

function loadCustomHosts() {
  try {
    const raw = localStorage.getItem(CUSTOM_HOSTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveCustomHosts(hosts) {
  try {
    localStorage.setItem(CUSTOM_HOSTS_KEY, JSON.stringify(hosts));
  } catch (e) {
    // Storage unavailable — in-memory state for this page load still works.
  }
}

// Built-in hosts (Mikocheni, Masaki, etc.) are defined in code, not
// storage — "deleting" one just remembers its key here so it's filtered
// out of the list, without losing the underlying booking data.
const HIDDEN_HOSTS_KEY = 'urbanhomes-hidden-hosts-v1';

function loadHiddenHostKeys() {
  try {
    const raw = localStorage.getItem(HIDDEN_HOSTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveHiddenHostKeys(keys) {
  try {
    localStorage.setItem(HIDDEN_HOSTS_KEY, JSON.stringify(keys));
  } catch (e) {
    // Storage unavailable — in-memory state for this page load still works.
  }
}

// ---------- Host grouping (shared: Host page + Finances dashboard) ----------
// The sheet doesn't record a separate "host name" field — only the
// apartment/unit string, which is entered inconsistently (e.g. "Masaki",
// "MASAKI", "Micnic masaki", "masaki studio" are all the same property).
// So "hosts" are grouped by normalized property name, matched via keywords.
const BUILTIN_HOST_DEFS = [
  { key: 'mikocheni', name: 'Mikocheni', icon: '🏢', keywords: ['mikocheni'] },
  { key: 'masaki',    name: 'Masaki',    icon: '🏙️', keywords: ['masaki'] },
  { key: 'sinza',     name: 'Sinza',     icon: '🏘️', keywords: ['sinza'] },
  { key: 'mwenge',    name: 'Mwenge',    icon: '🏠', keywords: ['mwenge'] },
  { key: 'mpv',       name: 'MPV',       icon: '🏨', keywords: ['mpv'] },
];

// Catch-all for anything that doesn't match a keyword — mostly early
// bookings logged by room number only, before named properties were used.
const OTHER_HOST_DEF = { key: 'other', name: 'Other units', icon: '🔑', keywords: [] };

function allHostDefs() {
  const hidden = loadHiddenHostKeys();
  const builtins = BUILTIN_HOST_DEFS.filter(h => !hidden.includes(h.key));
  return [...builtins, ...loadCustomHosts(), OTHER_HOST_DEF];
}

function normalizeApartment(apartment) {
  const a = (apartment || '').trim().toLowerCase();
  if (!a) return 'other';
  const hidden = loadHiddenHostKeys();
  // Skip hidden (deleted) built-ins so their bookings fall through to
  // "Other units" instead of matching a key that no longer has a card.
  for (const h of BUILTIN_HOST_DEFS) {
    if (hidden.includes(h.key)) continue;
    if (h.keywords.some(k => a.includes(k))) return h.key;
  }
  for (const h of loadCustomHosts()) {
    if (h.keywords.some(k => a.includes(k))) return h.key;
  }
  return 'other';
}

// ---------- Profile (set from the Settings page) ----------
const PROFILE_KEY = 'urbanhomes-profile-v1';
const DEFAULT_PROFILE = { name: 'Mike' };

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && parsed.name ? parsed : { ...DEFAULT_PROFILE };
  } catch (e) {
    return { ...DEFAULT_PROFILE };
  }
}

function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    // Storage unavailable — in-memory state for this page load still works.
  }
}

// ---------- Local device lock (client-side only) ----------
// This is NOT real multi-user authentication — there's no backend yet.
// It's a lightweight password gate stored (hashed, never plaintext) in
// this browser only, meant to deter casual access on a shared device
// until a real login/accounts system replaces it. Anyone with devtools
// access to this browser can still bypass it entirely (e.g. by setting
// the unlocked flag directly, or reading this file's source) — be
// upfront about that limit rather than overselling it as real security.
// Hashing is PBKDF2-SHA256 with a high iteration count (deliberately
// slow, unlike a bare SHA-256 digest) so an offline guess against a
// leaked hash is at least meaningfully expensive.
const AUTH_KEY = 'urbanhomes-auth-v1';
const UNLOCK_FLAG = 'urbanhomes-unlocked';
const PBKDF2_ITERATIONS = 150000;

function hasPassword() {
  try {
    return !!localStorage.getItem(AUTH_KEY);
  } catch (e) {
    return false;
  }
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

async function deriveHash(password, saltHex) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

// Setting a password also mints a fresh recovery code and returns it
// in plaintext so the caller can show it to the user exactly once —
// it's never stored anywhere except hashed. This is the ONLY way back
// in if the password is forgotten; there is deliberately no one-click
// bypass, since anyone could click that just as easily as the owner.
async function setPassword(password) {
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await deriveHash(password, salt);
  localStorage.setItem(AUTH_KEY, JSON.stringify({ salt, hash }));
  markUnlocked();
  clearFailedAttempts();
  return setRecoveryCode(generateRecoveryCode());
}

function clearPassword() {
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(UNLOCK_FLAG);
  clearFailedAttempts();
  clearRecoveryCode();
}

async function verifyPassword(password) {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return true; // no lock configured — nothing to verify against
  let salt, hash;
  try {
    ({ salt, hash } = JSON.parse(raw));
  } catch (e) {
    return false; // corrupted record — fail closed rather than throw
  }
  const attempt = await deriveHash(password, salt);
  return attempt === hash;
}

// ---------- Recovery code ----------
// Generated fresh every time a password is set (see setPassword above).
// Excludes visually-ambiguous characters (0/O, 1/I/L) since it's meant
// to be hand-copied or read off a screenshot.
const RECOVERY_KEY = 'urbanhomes-recovery-v1';
const RECOVERY_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRecoveryCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let code = '';
  for (let i = 0; i < bytes.length; i++) {
    code += RECOVERY_CHARSET[bytes[i] % RECOVERY_CHARSET.length];
    if (i % 4 === 3 && i !== bytes.length - 1) code += '-';
  }
  return code; // e.g. "K3F9-7QXP-2MNB-9ZLT"
}

function normalizeRecoveryCode(code) {
  return (code || '').replace(/[\s-]/g, '').toUpperCase();
}

async function setRecoveryCode(code) {
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await deriveHash(normalizeRecoveryCode(code), salt);
  localStorage.setItem(RECOVERY_KEY, JSON.stringify({ salt, hash }));
  return code; // plaintext — caller shows this once, nothing else stores it
}

function hasRecoveryCode() {
  try {
    return !!localStorage.getItem(RECOVERY_KEY);
  } catch (e) {
    return false;
  }
}

async function verifyRecoveryCode(code) {
  const raw = localStorage.getItem(RECOVERY_KEY);
  if (!raw) return false; // no recovery code on file — nothing to check against
  let salt, hash;
  try {
    ({ salt, hash } = JSON.parse(raw));
  } catch (e) {
    return false;
  }
  const attempt = await deriveHash(normalizeRecoveryCode(code), salt);
  return attempt === hash;
}

function clearRecoveryCode() {
  localStorage.removeItem(RECOVERY_KEY);
}

function isUnlocked() {
  try {
    return sessionStorage.getItem(UNLOCK_FLAG) === 'true';
  } catch (e) {
    return true; // fail open rather than lock someone out over a storage error
  }
}

function markUnlocked() {
  try {
    sessionStorage.setItem(UNLOCK_FLAG, 'true');
  } catch (e) {
    // Storage unavailable — the lock check will just fail open (see isUnlocked).
  }
}

function lockNow() {
  sessionStorage.removeItem(UNLOCK_FLAG);
}

// ---------- Failed-attempt throttling ----------
// Slows down casual guessing through the actual login/change-password
// forms. It does NOT stop someone calling verifyPassword() directly
// from devtools — there's no way to prevent that client-side — but it
// meaningfully raises the bar for guessing through the UI itself.
const ATTEMPTS_KEY = 'urbanhomes-auth-attempts-v1';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30000;

function loadAttemptState() {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed.count === 'number' ? parsed : { count: 0, lockedUntil: 0 };
  } catch (e) {
    return { count: 0, lockedUntil: 0 };
  }
}

function saveAttemptState(state) {
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(state));
  } catch (e) {
    // Storage unavailable — throttling just won't persist, verification still works.
  }
}

function recordFailedAttempt() {
  const state = loadAttemptState();
  state.count += 1;
  if (state.count >= MAX_ATTEMPTS) {
    state.lockedUntil = Date.now() + LOCKOUT_MS;
    state.count = 0;
  }
  saveAttemptState(state);
}

function clearFailedAttempts() {
  saveAttemptState({ count: 0, lockedUntil: 0 });
}

// Milliseconds remaining before another attempt is allowed (0 if not locked out).
function lockoutRemainingMs() {
  return Math.max(0, loadAttemptState().lockedUntil - Date.now());
}

function formatTZS(val) {
  const n = Number(val) || 0;
  return 'TZS ' + n.toLocaleString('en-US');
}

// Compact form for tight spaces (donut centers, KPI tiles): 1.2M / 850k.
function formatTZSCompact(val) {
  const n = Number(val) || 0;
  if (Math.abs(n) >= 1000000) return 'TZS ' + (n / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
  if (Math.abs(n) >= 1000) return 'TZS ' + Math.round(n / 1000) + 'k';
  return 'TZS ' + n;
}

function formatDisplayDate(iso) {
  if (!iso) return '—';
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} ${MONTHS_FULL[month - 1]}`;
}

function initials(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}

// "225,000+185,000" -> 410000 ; "225000" -> 225000 ; "" -> 0
function parseHostPaid(str) {
  if (!str) return 0;
  return String(str).split('+').reduce((sum, part) => {
    const n = parseInt(part.replace(/[^\d-]/g, ''), 10);
    return sum + (Number.isNaN(n) ? 0 : n);
  }, 0);
}

function statusPill(status) {
  const meta = STATUS_META[status] || STATUS_META['UPCOMING'];
  return `<span class="status ${meta.cls}">${meta.label}</span>`;
}
