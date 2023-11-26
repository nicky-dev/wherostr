import * as React from 'react'
import TextField, { TextFieldProps } from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { debounce } from '@mui/material/utils'
import { OSMSearchResult, search } from '@/services/osm'
import Geohash from 'latlon-geohash'
import { Box, CircularProgress, Divider } from '@mui/material'
import { Search } from '@mui/icons-material'
import { useProfilesCache } from '@/hooks/useUserProfile'
import Fuse from 'fuse.js'
import ProfileChip from './ProfileChip'
import { NostrPrefix, createNostrLink } from '@snort/system'

interface MainTextMatchedSubstrings {
  offset: number
  length: number
}
interface StructuredFormatting {
  main_text: string
  secondary_text: string
  main_text_matched_substrings?: readonly MainTextMatchedSubstrings[]
}

interface SearchBoxProps {
  onChange?: (q?: string) => void
  value?: string
}

interface SearchResultType extends Partial<OSMSearchResult> {
  hexpubkey?: string
}

const SearchBox: React.FC<
  Omit<TextFieldProps, 'onChange'> & SearchBoxProps
> = ({ placeholder, onChange, value, onBlur, autoFocus, ...props }) => {
  const [loading, setLoading] = React.useState(false)
  const [inputText, setInputText] = React.useState('')
  const [inputValue, setInputValue] = React.useState('')
  const [options, setOptions] = React.useState<
    readonly Partial<SearchResultType>[]
  >([])

  const fetch = React.useMemo(
    () =>
      debounce(
        (
          request: { input: string },
          callback: (results?: readonly Partial<SearchResultType>[]) => void,
        ) => {
          search(request.input).then(callback)
        },
        400,
      ),
    [],
  )

  const profiles = useProfilesCache()
  const fuse = React.useMemo(
    () =>
      new Fuse(profiles, {
        keys: ['name', 'displayName', 'username', 'nip05'],
      }),
    [profiles],
  )

  React.useEffect(() => {
    let active = true

    if (inputValue === '') {
      setOptions([])
      return undefined
    }

    if (inputValue.startsWith('@')) {
      setOptions([])
      const text = inputValue.slice(1)
      const options: SearchResultType[] = text
        ? fuse
            .search(text)
            .slice(0, 10)
            .map((item) => {
              const name = createNostrLink(
                NostrPrefix.PublicKey,
                item.item.hexpubkey,
              ).encode()
              return {
                place_id: -2,
                name: '/p/' + name,
                display_name: item.item.displayName,
                hexpubkey: item.item.hexpubkey,
              }
            })
        : profiles.slice(0, 10).map((item) => {
            const name = createNostrLink(
              NostrPrefix.PublicKey,
              item.hexpubkey,
            ).encode()
            return {
              place_id: -2,
              name: '/p/' + name,
              display_name: item.displayName,
              hexpubkey: item.hexpubkey,
            }
          })
      setOptions(options)
      return
    }
    const searchHashTagOptions = {
      place_id: -1,
      name:
        '/t/' +
        inputValue
          .split(' ')
          .filter((d) => !!d.trim())
          .map((d) => `${d.trim().toLowerCase()}`)
          .join(','),
      display_name: `Search notes: ${inputValue
        .split(' ')
        .filter((d) => !!d.trim())
        .map((d) => `#${d.trim()}`)
        .join(', ')}`,
    }

    const searchPeopleOptions = {
      place_id: -2,
      name:
        '/p/' +
        inputValue
          .split(' ')
          .filter((d) => !!d.trim())
          .map((d) => `${d.trim()}`)
          .join(','),
      display_name: `Search people: ${inputValue.trim()}`,
    }

    setOptions([searchHashTagOptions])

    setLoading(true)
    fetch(
      { input: inputValue },
      (results?: readonly Partial<OSMSearchResult>[]) => {
        if (active) {
          let newOptions: readonly Partial<OSMSearchResult>[] = [
            searchHashTagOptions,
          ]

          if (!!results?.length) {
            newOptions = [...newOptions, ...results]
          }

          setOptions(newOptions)
        }
        setLoading(false)
      },
    )

    return () => {
      active = false
      setLoading(false)
    }
  }, [inputValue, fetch, fuse, profiles])

  const handleSelectValue = React.useCallback(
    (event: any, newValue: Partial<OSMSearchResult> | null) => {
      setInputText('')
      if (newValue?.place_id === -1 || newValue?.place_id === -2) {
        onChange?.(newValue.name)
      } else if (newValue?.boundingbox) {
        const [y1, y2, x1, x2] = newValue.boundingbox.map((b: string) =>
          Number(b),
        )
        const bbhash = `/b/${Geohash.encode(y1, x1, 10)},${Geohash.encode(
          y2,
          x2,
          10,
        )}`
        onChange?.(bbhash)
      } else if (newValue?.lat && newValue?.lon) {
        const ghash = `/g/${Geohash.encode(
          Number(newValue?.lat),
          Number(newValue?.lon),
          10,
        )}`
        onChange?.(ghash)
      }
    },
    [onChange],
  )

  return (
    <Autocomplete
      id="autocomplete-search"
      fullWidth
      getOptionLabel={(option) => {
        return typeof option === 'string' ? option : option.display_name!
      }}
      options={options}
      disablePortal
      inputValue={inputText}
      noOptionsText={placeholder}
      selectOnFocus
      handleHomeEndKeys={false}
      popupIcon={<Search />}
      forcePopupIcon
      slotProps={{
        popupIndicator: {
          sx: { transform: 'rotate(0)' },
        },
      }}
      onChange={handleSelectValue}
      onInputChange={(_, value) => {
        setInputValue(value)
        setInputText(value)
      }}
      onKeyDown={(evt) => {
        if (evt.key === 'Enter') {
          evt.defaultPrevented = true
          handleSelectValue(evt, options[0])
        }
      }}
      filterOptions={
        inputText.startsWith('@') ? (options) => options : undefined
      }
      renderInput={(params) => (
        <TextField
          className="!my-0"
          {...params}
          name="search"
          margin="dense"
          size="small"
          fullWidth
          placeholder={placeholder}
          InputProps={{
            autoComplete: 'off',
            ...params.InputProps,
          }}
          onBlur={onBlur}
          autoFocus={autoFocus}
        />
      )}
      renderOption={(props, option) => {
        if ('hexpubkey' in option) {
          return (
            <li {...props} key={option.hexpubkey}>
              <ProfileChip
                className="p-2"
                hexpubkey={option.hexpubkey}
                clickable={false}
              />
            </li>
          )
        }

        if (option.place_id === -1) {
          return (
            <React.Fragment key={option.place_id}>
              <li {...props}>
                <Grid container alignItems="center">
                  {/* <Grid item sx={{ display: 'flex', width: 44 }}>
                    <Note sx={{ color: 'text.secondary' }} />
                  </Grid> */}
                  <Grid
                    item
                    sx={{ width: 'calc(100% - 44px)', wordWrap: 'break-word' }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {option.display_name}
                    </Typography>
                  </Grid>
                </Grid>
              </li>
              <Divider sx={{ my: 0.5 }} textAlign="left">
                <Typography variant="subtitle2" color="text.secondary">
                  Places
                </Typography>
              </Divider>
              {loading ? (
                <CircularProgress
                  color="inherit"
                  size={16}
                  sx={{ display: 'block', mx: 'auto' }}
                />
              ) : options.length === 1 ? (
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  fontStyle="italic"
                  ml={2}
                >
                  No places found
                </Typography>
              ) : undefined}
            </React.Fragment>
          )
        }

        return (
          <li {...props} key={option.place_id}>
            <Grid container alignItems="center">
              {option.place_id === -2 ? (
                <div />
              ) : (
                // <Grid item sx={{ display: 'flex', width: 44 }}>
                //   <People sx={{ color: 'text.secondary' }} />
                // </Grid>
                <Grid item sx={{ display: 'flex', width: 44 }}>
                  <LocationOnIcon sx={{ color: 'text.secondary' }} />
                </Grid>
              )}
              <Grid
                item
                sx={{ width: 'calc(100% - 44px)', wordWrap: 'break-word' }}
              >
                <Typography variant="body2" color="text.secondary">
                  {option.display_name}
                </Typography>
              </Grid>
            </Grid>
          </li>
        )
      }}
    />
  )
}

export default SearchBox
