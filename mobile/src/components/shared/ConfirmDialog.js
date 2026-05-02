import React from 'react';
import { StyleSheet } from 'react-native';
import { Portal, Dialog, Button, Text } from 'react-native-paper';
import colors from '../../constants/colors';

const ConfirmDialog = ({ visible, title, message, onConfirm, onCancel, confirmText = 'Confirm', confirmColor }) => {
    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onCancel} style={styles.dialog}>
                <Dialog.Title style={styles.title}>{title}</Dialog.Title>
                <Dialog.Content>
                    <Text variant="bodyMedium" style={styles.message}>{message}</Text>
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={onCancel} textColor={colors.textSecondary}>
                        Cancel
                    </Button>
                    <Button onPress={onConfirm} textColor={confirmColor || colors.primary}>
                        {confirmText}
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
};

const styles = StyleSheet.create({
    dialog: {
        backgroundColor: colors.surface,
        borderRadius: 8,
    },
    title: {
        color: colors.text,
        fontWeight: 'bold',
    },
    message: {
        color: colors.textSecondary,
    },
});

export default ConfirmDialog;
