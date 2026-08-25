import * as Auth from "@/lib/_core/auth";

type KiniSession = {
  sessionToken: string;
  user: {
    id: number;
    openId: string;
    name: string | null;
    email: string | null;
    loginMethod: string | null;
    lastSignedIn: Date | string;
  };
};

export async function completeKiniSession(session: KiniSession) {
  await Auth.setSessionToken(session.sessionToken);
  await Auth.setUserInfo({ ...session.user, lastSignedIn: new Date(session.user.lastSignedIn) });
}
