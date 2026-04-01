import PropTypes from 'prop-types'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material'

/**
 * Render a generic form dialog for create and edit flows.
 *
 * @param {object} props
 * @returns {JSX.Element}
 */
function EntityDialog({
  open,
  title,
  fields,
  values,
  fieldErrors,
  error,
  busy,
  submitLabel,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2.25}>
          {error && <Alert severity="error">{error}</Alert>}
          {fields.map((field) => {
            const value = field.type === 'multiselect' ? values[field.name] || [] : values[field.name] || ''
            const helperText = fieldErrors[field.name] || field.helperText || ' '

            if (field.type === 'select' || field.type === 'multiselect') {
              return (
                <FormControl fullWidth key={field.name} margin="dense">
                  <InputLabel>{field.label}</InputLabel>
                  <Select
                    label={field.label}
                    multiple={field.type === 'multiselect'}
                    value={value}
                    onChange={(event) => onChange(field.name, event.target.value)}
                  >
                    {(field.options || []).map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <Alert
                    icon={false}
                    severity={fieldErrors[field.name] ? 'error' : 'info'}
                    sx={{ mt: 1, py: 0, px: 0.5 }}
                  >
                    {helperText}
                  </Alert>
                </FormControl>
              )
            }

            return (
              <TextField
                fullWidth
                key={field.name}
                margin="dense"
                type={field.type === 'email' ? 'email' : 'text'}
                multiline={field.type === 'textarea'}
                minRows={field.type === 'textarea' ? 3 : undefined}
                label={field.label}
                value={value}
                onChange={(event) => onChange(field.name, event.target.value)}
                error={Boolean(fieldErrors[field.name])}
                helperText={helperText}
              />
            )
          })}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit} variant="contained">
          {busy ? 'Saving...' : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

EntityDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  fields: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      type: PropTypes.string,
      helperText: PropTypes.string,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired,
        }),
      ),
    }),
  ).isRequired,
  values: PropTypes.object.isRequired,
  fieldErrors: PropTypes.object,
  error: PropTypes.string,
  busy: PropTypes.bool,
  submitLabel: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
}

EntityDialog.defaultProps = {
  fieldErrors: {},
  error: '',
  busy: false,
  submitLabel: 'Save',
}

export default EntityDialog
