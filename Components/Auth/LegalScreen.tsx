import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';

export default function LegalScreen() {
  return (
    <ScrollView style={styles.container}>
      {/* Terms and Conditions Section */}
      <Text style={styles.heading}>Terms and Conditions</Text>
      <Text style={styles.text}>
        Last Updated: [Date]

        {"\n\n"}Welcome to [Your App Name]. By downloading, installing, or using this app, you agree to the following terms and conditions. Please read them carefully.

        {"\n\n"}1. Acceptance of Terms
        {"\n"}By accessing or using the app, you agree to comply with these terms. If you do not agree, you must not use the app.

        {"\n\n"}2. User Accounts
        {"\n"}- Users may create an account using a username or alias.
        {"\n"}- You are responsible for keeping your login credentials secure.
        {"\n"}- You must provide accurate information and not impersonate others.

        {"\n\n"}3. Privacy
        {"\n"}- Your personal data will be collected, stored, and used as described in our Privacy Policy.
        {"\n"}- We do not share personal information with third parties without consent, except as required by law.
        {"\n"}- Avoid sharing sensitive personal information in debates or messages.

        {"\n\n"}4. Content Guidelines
        {"\n"}- Users are responsible for the content they post.
        {"\n"}- Offensive, abusive, harassing, or illegal content is strictly prohibited.
        {"\n"}- The app has moderation systems, but we do not guarantee 100% content control.

        {"\n\n"}5. Reporting and Moderation
        {"\n"}- Users can report inappropriate content or behavior.
        {"\n"}- Violations may result in content removal, account suspension, or permanent ban.

        {"\n\n"}6. Intellectual Property
        {"\n"}- All content you post remains your responsibility.
        {"\n"}- You grant [Your App Name] a license to display, distribute, and use your content within the app.
        {"\n"}- The app and its original content, design, and software are owned by [Your Company/Name] and protected by law.

        {"\n\n"}7. Limitation of Liability
        {"\n"}- [Your App Name] is provided “as is” without warranties of any kind.
        {"\n"}- We are not responsible for personal disputes, offensive content, or data loss.
        {"\n"}- Use the app at your own risk.

        {"\n\n"}8. Termination
        {"\n"}- We may suspend or terminate your account for violations.
        {"\n"}- Users may delete their account at any time.

        {"\n\n"}9. Changes to Terms
        {"\n"}- We may update these terms from time to time.
        {"\n"}- Users will be notified of significant changes via the app or email.

        {"\n\n"}10. Governing Law
        {"\n"}- These terms are governed by the laws of [Your Country/State].
        {"\n"}- Any disputes shall be resolved under the jurisdiction of [Your City/Country].

        {"\n\n"}11. Contact
        {"\n"}Email: [your-email@example.com]
        {"\n"}Address: [Your Address]
      </Text>

      {/* Privacy Policy Section */}
      <Text style={styles.heading}>Privacy Policy</Text>
      <Text style={styles.text}>
        Last Updated: [Date]

        {"\n\n"}1. Data Collection
        {"\n"}- We collect minimal information such as username, email, and password.
        {"\n"}- We do not track users beyond what is necessary for app functionality.

        {"\n\n"}2. Data Usage
        {"\n"}- Data is used to provide and improve app services.
        {"\n"}- Emails are used for account verification and notifications only.

        {"\n\n"}3. Data Sharing
        {"\n"}- We do not share your personal information with third parties without consent, except when required by law.

        {"\n\n"}4. Data Security
        {"\n"}- All personal data is encrypted and securely stored.
        {"\n"}- We implement reasonable security measures to protect user data.

        {"\n\n"}5. User Rights
        {"\n"}- Users may request account deletion or data removal at any time.
        {"\n"}- Users can update their account information anytime.

        {"\n\n"}6. Children’s Privacy
        {"\n"}- This app is not intended for children under 13. We do not knowingly collect data from children.

        {"\n\n"}7. Changes to Policy
        {"\n"}- Privacy policies may change over time. Users will be notified of significant changes.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
});
