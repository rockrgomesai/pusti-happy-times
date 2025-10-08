"use client";

import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import SaveIcon from '@mui/icons-material/Save';

export interface ColumnVisibilityOption {
  id: string;
  label: string;
  alwaysVisible?: boolean;
}

interface ColumnVisibilityMenuProps {
  options: ColumnVisibilityOption[];
  selected: string[];
  onChange: (nextSelected: string[]) => void;
  onSaveSelection?: () => void;
  saveDisabled?: boolean;
  minSelectable?: number;
  buttonLabel?: string;
}

const ColumnVisibilityMenu: React.FC<ColumnVisibilityMenuProps> = ({
  options,
  selected,
  onChange,
  onSaveSelection,
  saveDisabled = false,
  minSelectable = 1,
  buttonLabel = 'Columns',
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);

  const selectableOptions = useMemo(
    () => options.filter((option) => !option.alwaysVisible),
    [options]
  );

  const selectableIds = useMemo(
    () => selectableOptions.map((option) => option.id),
    [selectableOptions]
  );

  const isAllSelected = useMemo(
    () => selectableIds.every((id) => selected.includes(id)),
    [selectableIds, selected]
  );

  const handleToggle = (id: string) => {
    if (!selected.includes(id)) {
      onChange([...selected, id]);
      return;
    }

    if (selected.length <= minSelectable) {
      return;
    }

    onChange(selected.filter((value) => value !== id));
  };

  const handleSelectAll = () => {
    onChange(selectableIds);
  };

  const handleButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSaveSelection = () => {
    if (onSaveSelection) {
      onSaveSelection();
    }
    handleClose();
  };

  const hiddenCount = selectableIds.length - selected.length;

  const buttonText = hiddenCount
    ? `${buttonLabel} (${selectableIds.length - hiddenCount}/${selectableIds.length})`
    : buttonLabel;

  return (
    <>
      <Tooltip title="Choose which columns are visible in the table">
        <span>
          <Button
            variant="outlined"
            startIcon={<ViewColumnIcon />}
            onClick={handleButtonClick}
            disabled={!selectableOptions.length}
          >
            {buttonText}
          </Button>
        </span>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        keepMounted
      >
        {!selectableOptions.length
          ? (
            <MenuItem disabled>
              <ListItemText primary="No columns available to toggle" />
            </MenuItem>
          )
          : [
              <MenuItem key="header" disabled>
                <ListItemText primary="Toggle columns" secondary="Hide or show columns in the table" />
              </MenuItem>,
              <Divider key="divider-1" />,
              <Box key="form-group" sx={{ px: 2, py: 1, maxHeight: 240, overflowY: 'auto' }}>
                <FormGroup>
                  {selectableOptions.map((option) => {
                    const checked = selected.includes(option.id);
                    return (
                      <FormControlLabel
                        key={option.id}
                        control={
                          <Checkbox
                            checked={checked}
                            onChange={() => handleToggle(option.id)}
                            icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                            checkedIcon={<CheckBoxIcon fontSize="small" />}
                            size="small"
                          />
                        }
                        label={option.label}
                      />
                    );
                  })}
                </FormGroup>
              </Box>,
              <Divider key="divider-2" />,
              <MenuItem key="show-all" onClick={handleSelectAll} disabled={isAllSelected}>
                <ListItemIcon>
                  <CheckBoxIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Show all columns" />
              </MenuItem>,
              <MenuItem
                key="save"
                onClick={handleSaveSelection}
                disabled={!onSaveSelection || saveDisabled}
              >
                <ListItemIcon>
                  <SaveIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Save selection" />
              </MenuItem>,
            ]}
      </Menu>
    </>
  );
};

export default ColumnVisibilityMenu;
