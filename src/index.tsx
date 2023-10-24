/* eslint-disable @typescript-eslint/ban-ts-comment */
import { makePersisted } from '@solid-primitives/storage';
import {
  Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  mergeProps,
  Setter,
  useContext,
} from 'solid-js';
import { isServer } from 'solid-js/web';
import { Meta, useLocation, useNavigate, useSearchParams } from 'solid-start';

import { currentURLIsAllowed } from './currentURLIsAllowed';

type AsyncVoidFunction = () => Promise<void>;

const keyAccessToken = 'accessToken';
const keyRedirectUrl = 'redirectURL';

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

const useFullPathName = () => {
  const location = useLocation();

  return createMemo(() => {
    return `${location.pathname}${location.search}`;
  });
};

export const getAccessToken = () => {
  const [accessToken] = useAccessTokenStorage();

  return accessToken();
};

export const setAccessToken = (accessToken: string) => {
  const [, setAccessToken] = useAccessTokenStorage();

  setAccessToken(accessToken);
};

export const removeAccessToken = () => {
  const [, setAccessToken] = useAccessTokenStorage();

  setAccessToken(undefined);
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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
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
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    if (!isServer) {
      (async () => {
        if (searchParams.redirectURL) {
          setRedirectURL(searchParams.redirectURL as string);
        }

        if (getAccessToken() !== null && getAccessToken() !== undefined) {
          navigate(authCallbackURL);
          return;
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

    if (!isServer) {
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
    const [searchParams] = useSearchParams();

    if (!isServer) {
      if (searchParams.accessToken) {
        (async () => {
          await getAndSaveAccessToken({
            accessToken: searchParams.accessToken as string,
          });

          //@ts-ignore
          callback && (await callback(redirectURL() ?? undefined));

          setRedirectURL(undefined);
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

  const auth = useSolidStartAuthProtected();
  const [accessToken, setAccessToken] = useAccessTokenStorage();
  const location = useLocation();
  const navigate = useNavigate();
  const fullPathName = useFullPathName();

  createEffect(() => {
    if (!isServer && !!auth.setIsConnected) {
      (async () => {
        let userIsConnected = !!accessToken();

        // Verify token if user is connected to check validity
        if (userIsConnected && props.verifyTokenFct) {
          //@ts-ignore
          if (!(await props.verifyTokenFct(accessToken()))) {
            setAccessToken(undefined);
            auth.setIsConnected(false);

            return navigate(
              `${props.loginURL}?redirectURL=${encodeURIComponent(
                fullPathName()
              )}`
            );
          } else {
            userIsConnected = true;
          }
        }

        // If user is not connected try to renew it
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
          !currentURLIsAllowed(location.pathname, [
            ...(props.publicURLs as string[]),
            props.loginURL,
            ...(props.authCallbackURL ? [props.authCallbackURL] : []),
          ]) &&
          !(props.allowNotFound
            ? ['/_error', '/404'].indexOf(location.pathname) !== -1
            : false)
        ) {
          console.log(props.loginURL, fullPathName());
          //Redirect to login
          setAccessToken(undefined);
          auth.setIsConnected(false);
          return navigate(
            `${props.loginURL}?redirectURL=${encodeURIComponent(
              fullPathName()
            )}`
          );
        }

        auth.setIsConnected(userIsConnected);
        return;
      })();
    }
  });
};
