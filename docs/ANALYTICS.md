# Optionale Analyse

V1 lädt keine Meta-, TikTok- oder Google-Analytics-Skripte und sendet keine Analyseereignisse. Der localStorage-Warenkorb ist funktional. Es gibt keinen wirkungslosen Cookie-Banner.

Bei späterer Einführung: separaten ConsentProvider verwenden, Kategorien und gespeicherte Einwilligung versionieren, Widerruf im Footer anbieten. Vendor-Skripte erst nach passender Zustimmung über next/script laden; vor Einwilligung keine Requests/Preconnects. Einwilligung und eventuelle serverseitige Conversion-API zusammen prüfen. Kaufereignisse erst nach serverseitig bestätigter Zahlung deduplizieren; keine Namen, Adressen, Tokens oder Lieferdetails an Analytics senden. Anbieter-IDs über Environment verwalten, CSP gezielt ergänzen und Datenschutzerklärung aktualisieren. Integrations- und Netzwerk-Test muss auch „Ablehnen“ und „Widerrufen“ abdecken.
