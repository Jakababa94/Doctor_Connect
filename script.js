// Data storage (in production, this would be a database)
        let patients = JSON.parse(localStorage.getItem('patients')) || [];
        let appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        let notifications = JSON.parse(localStorage.getItem('notifications')) || [];
        let settings = JSON.parse(localStorage.getItem('settings')) || {
            reminderTime: 24,
            autoReminders: true,
            messageTemplate: "Hi {patientName}, this is a reminder for your appointment with {doctorName} on {date} at {time}. Please confirm your attendance."
        };

        // Initialize the application
        document.addEventListener('DOMContentLoaded', function() {
            loadPatients();
            loadAppointments();
            loadNotifications();
            updateAnalytics();
            checkPendingReminders();
            
            // Set default date to today
            document.getElementById('appointmentDate').valueAsDate = new Date();
        });

        // Tab navigation
        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Remove active class from all nav tabs
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
        }

        // Patient management
        document.getElementById('patientForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const channels = [];
            document.querySelectorAll('input[name="commChannel"]:checked').forEach(ch => {
                channels.push(ch.value);
            });
            
            const patient = {
                id: Date.now(),
                name: document.getElementById('patientName').value,
                phone: document.getElementById('patientPhone').value,
                email: document.getElementById('patientEmail').value,
                whatsapp: document.getElementById('patientWhatsApp').value,
                preferredChannels: channels,
                createdAt: new Date().toISOString()
            };
            
            patients.push(patient);
            localStorage.setItem('patients', JSON.stringify(patients));
            
            logNotification('Patient added: ' + patient.name, 'success');
            loadPatients();
            updateAnalytics();
            this.reset();
        });

        function loadPatients() {
            const patientSelect = document.getElementById('patientSelect');
            const patientsList = document.getElementById('patientsList');
            
            // Update patient dropdown
            patientSelect.innerHTML = '<option value="">Select Patient</option>';
            patients.forEach(patient => {
                patientSelect.innerHTML += `<option value="${patient.id}">${patient.name}</option>`;
            });
            
            // Update patients list
            patientsList.innerHTML = '';
            patients.forEach(patient => {
                const channels = patient.preferredChannels.join(', ') || 'None selected';
                patientsList.innerHTML += `
                    <div class="appointment-card">
                        <div class="patient-name">${patient.name}</div>
                        <div class="appointment-time">📞 ${patient.phone}</div>
                        <div class="appointment-time">📧 ${patient.email || 'Not provided'}</div>
                        <div class="appointment-time">💬 Preferred: ${channels}</div>
                        <button class="btn btn-danger" onclick="deletePatient(${patient.id})">Delete</button>
                    </div>
                `;
            });
        }

        function deletePatient(patientId) {
            if (confirm('Are you sure you want to delete this patient?')) {
                patients = patients.filter(p => p.id !== patientId);
                localStorage.setItem('patients', JSON.stringify(patients));
                loadPatients();
                updateAnalytics();
                logNotification('Patient deleted', 'error');
            }
        }

        // Appointment management
        document.getElementById('appointmentForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const patientId = parseInt(document.getElementById('patientSelect').value);
            const patient = patients.find(p => p.id === patientId);
            
            if (!patient) {
                alert('Please select a patient');
                return;
            }
            
            const appointment = {
                id: Date.now(),
                patientId: patientId,
                patientName: patient.name,
                doctorName: document.getElementById('doctorName').value,
                date: document.getElementById('appointmentDate').value,
                time: document.getElementById('appointmentTime').value,
                type: document.getElementById('appointmentType').value,
                notes: document.getElementById('appointmentNotes').value,
                reminderSent: false,
                createdAt: new Date().toISOString()
            };
            
            appointments.push(appointment);
            localStorage.setItem('appointments', JSON.stringify(appointments));
            
            logNotification(`Appointment scheduled for ${patient.name}`, 'success');
            loadAppointments();
            updateAnalytics();
            this.reset();
        });

        function loadAppointments() {
            const appointmentsList = document.getElementById('appointmentsList');
            appointmentsList.innerHTML = '';
            
            // Sort appointments by date and time
            const sortedAppointments = appointments
                .filter(apt => new Date(apt.date + ' ' + apt.time) >= new Date())
                .sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
            
            sortedAppointments.forEach(appointment => {
                const appointmentDateTime = new Date(appointment.date + ' ' + appointment.time);
                const statusClass = appointment.reminderSent ? 'status-sent' : 'status-pending';
                const statusText = appointment.reminderSent ? 'Reminder Sent' : 'Pending';
                
                appointmentsList.innerHTML += `
                    <div class="appointment-card">
                        <div class="appointment-header">
                            <div>
                                <div class="patient-name">${appointment.patientName}</div>
                                <div class="appointment-time">
                                    📅 ${formatDate(appointment.date)} at ${appointment.time}
                                </div>
                                <div class="appointment-time">
                                    👨‍⚕️ ${appointment.doctorName} • ${appointment.type}
                                </div>
                                ${appointment.notes ? `<div class="appointment-time">📝 ${appointment.notes}</div>` : ''}
                            </div>
                        </div>
                        <div class="reminder-status ${statusClass}">${statusText}</div>
                        <button class="btn" onclick="sendReminderNow(${appointment.id})">Send Reminder Now</button>
                        <button class="btn btn-danger" onclick="deleteAppointment(${appointment.id})">Cancel</button>
                    </div>
                `;
            });
        }

        function deleteAppointment(appointmentId) {
            if (confirm('Are you sure you want to cancel this appointment?')) {
                appointments = appointments.filter(a => a.id !== appointmentId);
                localStorage.setItem('appointments', JSON.stringify(appointments));
                loadAppointments();
                updateAnalytics();
                logNotification('Appointment cancelled', 'error');
            }
        }

        // Reminder system
        function sendReminderNow(appointmentId) {
            const appointment = appointments.find(a => a.id === appointmentId);
            const patient = patients.find(p => p.id === appointment.patientId);
            
            if (!patient || !appointment) return;
            
            // Simulate sending reminders through all preferred channels
            patient.preferredChannels.forEach(channel => {
                sendReminder(appointment, patient, channel);
            });
            
            // Mark reminder as sent
            appointment.reminderSent = true;
            localStorage.setItem('appointments', JSON.stringify(appointments));
            loadAppointments();
        }

        function sendReminder(appointment, patient, channel) {
            const message = formatMessage(appointment, patient);
            
            // Simulate API calls to different services
            switch(channel) {
                case 'sms':
                    simulateSMSDelivery(patient.phone, message);
                    break;
                case 'email':
                    simulateEmailDelivery(patient.email, message);
                    break;
                case 'whatsapp':
                    simulateWhatsAppDelivery(patient.whatsapp, message);
                    break;
            }
            
            logNotification(`${channel.toUpperCase()} reminder sent to ${patient.name}`, 'success');
        }

        function formatMessage(appointment, patient) {
            let template = document.getElementById('messageTemplate').value || settings.messageTemplate;
            
            return template
                .replace('{patientName}', patient.name)
                .replace('{doctorName}', appointment.doctorName)
                .replace('{date}', formatDate(appointment.date))
                .replace('{time}', appointment.time);
        }

        // Simulation functions (in production, these would be actual API calls)
        function simulateSMSDelivery(phone, message) {
            console.log(`SMS to ${phone}: ${message}`);
            // Here you would integrate with SMS services like Twilio, Nexmo, etc.
            return Promise.resolve({ success: true, messageId: 'sms_' + Date.now() });
        }

        function simulateEmailDelivery(email, message) {
            console.log(`Email to ${email}: ${message}`);
            // Here you would integrate with email services like SendGrid, Mailgun, etc.
            return Promise.resolve({ success: true, messageId: 'email_' + Date.now() });
        }

        function simulateWhatsAppDelivery(whatsapp, message) {
            console.log(`WhatsApp to ${whatsapp}: ${message}`);
            // Here you would integrate with WhatsApp Business API
            return Promise.resolve({ success: true, messageId: 'wa_' + Date.now() });
        }

        function sendAllReminders() {
            let count = 0;
            const now = new Date();
            const reminderHours = parseInt(document.getElementById('reminderTime').value) || settings.reminderTime;
            
            appointments.forEach(appointment => {
                if (appointment.reminderSent) return;
                
                const appointmentTime = new Date(appointment.date + ' ' + appointment.time);
                const timeUntilAppointment = (appointmentTime - now) / (1000 * 60 * 60); // hours
                
                if (timeUntilAppointment <= reminderHours && timeUntilAppointment > 0) {
                    const patient = patients.find(p => p.id === appointment.patientId);
                    if (patient && patient.preferredChannels.length > 0) {
                        patient.preferredChannels.forEach(channel => {
                            sendReminder(appointment, patient, channel);
                        });
                        appointment.reminderSent = true;
                        count++;
                    }
                }
            });
            
            localStorage.setItem('appointments', JSON.stringify(appointments));
            loadAppointments();
            updateAnalytics();
            
            if (count > 0) {
                logNotification(`${count} reminders sent successfully`, 'success');
            } else {
                logNotification('No reminders needed at this time', 'info');
            }
        }

        function checkPendingReminders() {
            if (settings.autoReminders) {
                sendAllReminders();
            }
            
            // Check every 30 minutes
            setTimeout(checkPendingReminders, 30 * 60 * 1000);
        }

        function testReminder() {
            document.getElementById('testModal').style.display = 'block';
        }

        function closeModal() {
            document.getElementById('testModal').style.display = 'none';
        }

        function executeTestReminder() {
            const selectedChannel = document.querySelector('input[name="testChannel"]:checked');
            if (!selectedChannel) {
                alert('Please select a communication channel');
                return;
            }
            
            const testMessage = "This is a test reminder from MedRemind Pro. Your system is working correctly!";
            
            switch(selectedChannel.value) {
                case 'sms':
                    simulateSMSDelivery('+1234567890', testMessage);
                    break;
                case 'email':
                    simulateEmailDelivery('test@example.com', testMessage);
                    break;
                case 'whatsapp':
                    simulateWhatsAppDelivery('+1234567890', testMessage);
                    break;
            }
            
            logNotification(`Test ${selectedChannel.value.toUpperCase()} reminder sent successfully`, 'success');
            closeModal();
        }

        // Notification logging
        function logNotification(message, type = 'info') {
            const notification = {
                id: Date.now(),
                message: message,
                type: type,
                timestamp: new Date().toISOString()
            };
            
            notifications.unshift(notification);
            
            // Keep only last 100 notifications
            if (notifications.length > 100) {
                notifications = notifications.slice(0, 100);
            }
            
            localStorage.setItem('notifications', JSON.stringify(notifications));
            loadNotifications();
        }

        function loadNotifications() {
            const notificationLog = document.getElementById('notificationLog');
            notificationLog.innerHTML = '';
            
            notifications.slice(0, 20).forEach(notification => {
                const logClass = notification.type === 'error' ? 'error' : '';
                notificationLog.innerHTML += `
                    <div class="log-entry ${logClass}">
                        <div>${notification.message}</div>
                        <div class="log-timestamp">${formatDateTime(notification.timestamp)}</div>
                    </div>
                `;
            });
        }

        // Analytics and statistics
        function updateAnalytics() {
            document.getElementById('totalAppointments').textContent = appointments.length;
            document.getElementById('totalPatients').textContent = patients.length;
            
            const remindersSent = appointments.filter(a => a.reminderSent).length;
            document.getElementById('remindersSent').textContent = remindersSent;
            
            const successRate = appointments.length > 0 ? 
                Math.round((remindersSent / appointments.length) * 100) : 0;
            document.getElementById('successRate').textContent = successRate + '%';
            
            updateRecentActivity();
        }

        function updateRecentActivity() {
            const recentActivity = document.getElementById('recentActivity');
            recentActivity.innerHTML = '';
            
            // Get recent appointments and notifications
            const recentItems = [
                ...appointments.slice(-5).map(a => ({
                    type: 'appointment',
                    message: `Appointment scheduled for ${a.patientName}`,
                    time: a.createdAt
                })),
                ...notifications.slice(0, 5).map(n => ({
                    type: 'notification',
                    message: n.message,
                    time: n.timestamp
                }))
            ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);
            
            recentItems.forEach(item => {
                recentActivity.innerHTML += `
                    <div class="appointment-card">
                        <div class="appointment-time">
                            ${item.type === 'appointment' ? '📅' : '📧'} ${item.message}
                        </div>
                        <div class="log-timestamp">${formatDateTime(item.time)}</div>
                    </div>
                `;
            });
        }

        // Utility functions
        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        function formatDateTime(isoString) {
            const date = new Date(isoString);
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Settings management
        document.getElementById('reminderTime').addEventListener('change', function() {
            settings.reminderTime = parseInt(this.value);
            localStorage.setItem('settings', JSON.stringify(settings));
        });

        document.getElementById('autoReminders').addEventListener('change', function() {
            settings.autoReminders = this.value === 'true';
            localStorage.setItem('settings', JSON.stringify(settings));
        });

        document.getElementById('messageTemplate').addEventListener('blur', function() {
            settings.messageTemplate = this.value;
            localStorage.setItem('settings', JSON.stringify(settings));
        });

        // Load settings on page load
        function loadSettings() {
            document.getElementById('reminderTime').value = settings.reminderTime;
            document.getElementById('autoReminders').value = settings.autoReminders.toString();
            document.getElementById('messageTemplate').value = settings.messageTemplate;
        }

        // Channel selector functionality
        document.querySelectorAll('.channel-option').forEach(option => {
            option.addEventListener('click', function() {
                const checkbox = this.querySelector('input[type="checkbox"]');
                const radio = this.querySelector('input[type="radio"]');
                
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                }
                
                if (radio) {
                    radio.checked = true;
                }
                
                this.classList.toggle('selected', checkbox ? checkbox.checked : radio.checked);
            });
        });

        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('testModal');
            if (event.target === modal) {
                closeModal();
            }
        }

        // Initialize settings on load
        document.addEventListener('DOMContentLoaded', function() {
            loadSettings();
        });

        // Demo data for testing (uncomment to add sample data)
        function addDemoData() {
            if (patients.length === 0) {
                const demoPatients = [
                    {
                        id: 1001,
                        name: "Wilson Kamande",
                        phone: "+254758107274",
                        email: "kamandewilson@gmail.com",
                        whatsapp: "+254758107274",
                        preferredChannels: ["sms", "email"],
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 1002,
                        name: "Sabina Chege",
                        phone: "+254712345678",
                        email: "chegesabina1@gmail.com",
                        whatsapp: "+254712345678",
                        preferredChannels: ["whatsapp", "email"],
                        createdAt: new Date().toISOString()
                    }
                ];
                
                patients = demoPatients;
                localStorage.setItem('patients', JSON.stringify(patients));
                
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                const demoAppointments = [
                    {
                        id: 2001,
                        patientId: 1001,
                        patientName: "John Smith",
                        doctorName: "Dr. Williams",
                        date: tomorrow.toISOString().split('T')[0],
                        time: "10:00",
                        type: "consultation",
                        notes: "Annual checkup",
                        reminderSent: false,
                        createdAt: new Date().toISOString()
                    }
                ];
                
                appointments = demoAppointments;
                localStorage.setItem('appointments', JSON.stringify(appointments));
                
                loadPatients();
                loadAppointments();
                updateAnalytics();
                
                logNotification('Demo data loaded successfully', 'success');
            }
        }

        // Uncomment the line below to load demo data on first visit
        addDemoData();

        // Theme Toggle
        const themeToggle = document.getElementById('themeToggle');
        const body = document.body;
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            body.classList.add('dark');
            themeToggle.textContent = '☀️';
        }
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark');
            if (body.classList.contains('dark')) {
                themeToggle.textContent = '☀️';
                localStorage.setItem('theme', 'dark');
            } else {
                themeToggle.textContent = '🌙';
                localStorage.setItem('theme', 'light');
            }
        });

        // Hamburger Menu
        const hamburger = document.getElementById('hamburger');
        const navTabs = document.querySelector('.nav-tabs');
        hamburger.addEventListener('click', () => {
            navTabs.classList.toggle('open');
        });
        // Optional: Close nav on tab click (mobile UX)
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                if (window.innerWidth <= 700) navTabs.classList.remove('open');
            });
        });