/* eslint-disable @typescript-eslint/ban-ts-comment */
import { makePersisted } from '@solid-primitives/storage';
import {
  Accessor,
  createContext,
  createEffect,
  createSignal,
  JSX,
  mergeProps,
  Setter,
  useContext,
} from 'solid-js';
import { isServer } from 'solid-js/web';
import { Meta, redirect, useLocation } from 'solid-start';

import { currentURLIsAllowed } from './currentURLIsAllowed';

type AsyncVoidFunction = () => Promise<void>;

const keyAccessToken = 'accessToken';
const keyRedirectUrl = 'redirectURL';

export const getAccessToken = () => {
  if (typeof localStorage === 'undefined') {
    return undefined;
  }

  const value = localStorage.getItem(keyAccessToken);

  return value === 'undefined' || !value ? undefined : JSON.parse(value);
};

export const setAccessToken = (accessToken: string) => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(keyAccessToken, `"${accessToken}"`);
};

export const removeAccessToken = () => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(keyAccessToken);
  return;
};

export const getAndSaveAccessToken = async ({
  renewTokenFct,
  accessToken,
}: {
  renewTokenFct?: (oldAccessToken?: string) => string | Promise<string>;
  accessToken?: string;
}) => {
  if (!accessToken && renewTokenFct) {
    try {
      const accessToken = await renewTokenFct(getAccessToken() ?? undefined);
      setAccessToken(accessToken);
      return true;
    } catch (error) {
      //Impossible to fetch new token redirect to logout
      throw new Error('need to redirect to logout');
    }
  } else if (accessToken) {
    setAccessToken(accessToken);
    return true;
  }

  return false;
};

//TODO to check if it's working
// LOCAL STORAGE FOR REDIRECT URL AND ACCESS TOKEN
const useRedirectURLStorage = () =>
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  makePersisted(createSignal<string | undefined>(undefined), {
    name: keyRedirectUrl,
  });

const useAccessTokenStorage = () =>
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  makePersisted(createSignal<string | undefined>(undefined), {
    name: keyAccessToken,
  });

export const SolidStartAuthProtectedLogin =
  ({
    callback,
    authCallbackURL,
  }: {
    callback?: VoidFunction | AsyncVoidFunction;
    authCallbackURL: string;
  }) =>
  () => {
    const [, setRedirectURL] = useRedirectURLStorage();
    const location = useLocation();

    if (isServer) {
      const currentUrl = new URL(location.toString());

      (async () => {
        if (getAccessToken() !== null && getAccessToken() !== undefined) {
          redirect(authCallbackURL);
          return;
        }

        if (currentUrl.searchParams.get('redirectURL')) {
          setRedirectURL(currentUrl.searchParams.get('redirectURL') as string);
        }

        callback && (await callback());
      })();
    }

    return <Meta name="robots" content="noindex, follow" />;
  };

export const SolidStartAuthProtectedLogout =
  ({
    preCallback,
    callback,
  }: {
    preCallback?: VoidFunction | AsyncVoidFunction;
    callback?: VoidFunction | AsyncVoidFunction;
  }) =>
  () => {
    const [, setRedirectURL] = useRedirectURLStorage();
    const [, setAccessToken] = useAccessTokenStorage();

    if (isServer) {
      (async () => {
        preCallback && (await preCallback());

        setRedirectURL(undefined);
        setAccessToken(undefined);

        callback && (await callback());
      })();
    }

    return <Meta name="robots" content="noindex, follow" />;
  };

export const SolidStartAuthProtectedCallback =
  ({
    callback,
    noTokenCallback,
  }: {
    callback?: (redirectURL?: string | undefined) => void | Promise<void>;
    noTokenCallback?: (
      redirectURL?: string | undefined
    ) => void | Promise<void>;
  }) =>
  () => {
    const [redirectURL, setRedirectURL] = useRedirectURLStorage();

    if (isServer) {
      //Can't use router it seems he don't have enough time to parse query here
      const currentUrl = new URL(window.location.toString());
      if (currentUrl.searchParams.get('accessToken')) {
        (async () => {
          await getAndSaveAccessToken({
            accessToken: currentUrl.searchParams.get('accessToken') as string,
          });

          setRedirectURL(undefined);

          //@ts-ignore
          callback && (await callback(redirectURL() ?? undefined));
        })();
      } else {
        (async () => {
          setRedirectURL(undefined);

          noTokenCallback &&
            //@ts-ignore
            (await noTokenCallback(redirectURL() ?? undefined));
        })();
      }
    }

    return <Meta name="robots" content="noindex, follow" />;
  };

type SolidStartAuthContextType = {
  isConnected: Accessor<boolean>;
  //@ts-ignore
  setIsConnected: Setter<boolean>;
};

export const SolidStartAuthContext =
  createContext<Partial<SolidStartAuthContextType>>();

export const SolidStartAuthProvider = (props: { children: JSX.Element }) => {
  const [isConnected, setIsConnected] = createSignal<boolean>(false);

  return (
    //@ts-ignore
    <SolidStartAuthContext.Provider
      value={
        { isConnected, setIsConnected } as Required<SolidStartAuthContextType>
      }
    >
      {props.children}
    </SolidStartAuthContext.Provider>
  );
};

export const useSolidStartAuthProtected = (): SolidStartAuthContextType => {
  return useContext(
    SolidStartAuthContext
  ) as Required<SolidStartAuthContextType>;
};

export const useSolidStartAuthProtectedHandler = (props: {
  publicURLs?: string[];
  loginURL: string;
  authCallbackURL?: string;
  renewTokenFct: (oldAccessToken?: string) => string | Promise<string>;
  verifyTokenFct?: (accessToken?: string) => boolean | Promise<boolean>;
  allowNotFound?: boolean;
}) => {
  props = mergeProps({ publicURLs: [], allowNotFound: false }, props);

  const { setIsConnected } = useSolidStartAuthProtected();
  const [accessToken, setAccessToken] = useAccessTokenStorage();
  const location = useLocation();

  createEffect(() => {
    if (isServer && setIsConnected) {
      (async () => {
        let userIsConnected = !!accessToken;

        if (userIsConnected && props.verifyTokenFct) {
          //@ts-ignore
          if (!(await props.verifyTokenFct(accessToken()))) {
            setAccessToken(undefined);
            setIsConnected(false);

            return redirect(
              `${props.loginURL}?redirectURL=${encodeURIComponent(
                location.toString()
              )}`
            );
          } else {
            userIsConnected = true;
          }
        }

        if (
          location.pathname !== props.loginURL &&
          (props.authCallbackURL
            ? location.pathname !== props.authCallbackURL
            : true) &&
          !userIsConnected
        ) {
          // Try to get accessToken
          try {
            userIsConnected = await getAndSaveAccessToken({
              renewTokenFct: props.renewTokenFct,
            });
            // eslint-disable-next-line no-empty
          } catch (error) {}
        }

        //Check if user can access page
        if (
          !userIsConnected &&
          !currentURLIsAllowed(location.toString(), [
            ...(props.publicURLs as string[]),
            props.loginURL,
            ...(props.authCallbackURL ? [props.authCallbackURL] : []),
          ]) &&
          !(props.allowNotFound
            ? ['/_error', '/404'].indexOf(location.pathname) !== -1
            : false)
        ) {
          //Redirect to login
          setAccessToken(undefined);
          setIsConnected(false);
          return redirect(
            `${props.loginURL}?redirectURL=${encodeURIComponent(
              location.toString()
            )}`
          );
        }

        setIsConnected(userIsConnected);
        return;
      })();
    }
  });
};
